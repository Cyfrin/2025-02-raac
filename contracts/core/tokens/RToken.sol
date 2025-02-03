// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../../libraries/math/WadRayMath.sol";

import "../../interfaces/core/pools/LendingPool/ILendingPool.sol";
import "../../interfaces/core/tokens/IRToken.sol";

/**
 * @title RToken
 * @notice Implementation of the interest-bearing token for the RAAC lending protocol.
 *         Users receive RToken when they deposit assets into the Reserve Pool.
 *         RToken balances increase over time due to interest accrual, represented by the liquidity index.
 * @dev This contract aligns with Aave's AToken implementation, scaling balances by the liquidity index.
 */
contract RToken is ERC20, ERC20Permit, IRToken, Ownable {
    using WadRayMath for uint256;
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    // Address of the Reserve Pool contract
    address private _reservePool;

    // Address of the Minter
    address public _minter;

    // Address of the Burner
    address public _burner;

    // Address of the reserve asset (e.g., crvUSD)
    address public _assetAddress;

    // Liquidity index, represents cumulative interest
    uint256 private _liquidityIndex;

    struct UserState {
        uint128 index;
    }

    mapping(address => UserState) private _userState;
 

    // MODIFIERS

    /**
     * @dev Ensures that only the Reserve Pool can call the function
     */
    modifier onlyReservePool() {
        if (msg.sender != _reservePool) revert OnlyReservePool();
        _;
    }

    // CONSTRUCTOR

    /**
     * @dev Initializes the RToken contract with the given parameters
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param initialOwner The address of the initial owner
     * @param assetAddress The address of the underlying asset
     */
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        address assetAddress
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(initialOwner) {
        if (initialOwner == address(0) || assetAddress == address(0)) revert InvalidAddress();
        _liquidityIndex = WadRayMath.RAY;
        _assetAddress = assetAddress;
    }

    // EXTERNAL FUNCTIONS

    /**
     * @notice Sets the Reserve Pool address
     * @param newReservePool The address of the Reserve Pool
     */
    function setReservePool(address newReservePool) external onlyOwner {
        if (newReservePool == address(0)) revert InvalidAddress();
        address oldReservePool = _reservePool;
        _reservePool = newReservePool;
        emit ReservePoolUpdated(oldReservePool, newReservePool);
    }

    /**
     * @notice Updates the liquidity index
     * @param newLiquidityIndex The new liquidity index
     */
    function updateLiquidityIndex(uint256 newLiquidityIndex) external override onlyReservePool {
        if (newLiquidityIndex < _liquidityIndex) revert InvalidAmount();
        _liquidityIndex = newLiquidityIndex;
        emit LiquidityIndexUpdated(newLiquidityIndex);
    }

    /**
     * @notice Mints RToken to a user
     * @param caller The address initiating the mint
     * @param onBehalfOf The recipient of the minted tokens
     * @param amountToMint The amount of tokens to mint (in underlying asset units)
     * @param index The liquidity index at the time of minting
     * @return A tuple containing:
     *         - bool: True if this is the first mint for the recipient, false otherwise
     *         - uint256: The amount of scaled tokens minted
     *         - uint256: The new total supply after minting
     *         - uint256: The amount of underlying tokens minted
     */
    function mint(
        address caller,
        address onBehalfOf,
        uint256 amountToMint,
        uint256 index
    ) external override onlyReservePool returns (bool, uint256, uint256, uint256) {
        if (amountToMint == 0) {
            return (false, 0, 0, 0);
        }
        uint256 amountScaled = amountToMint.rayDiv(index);
        if (amountScaled == 0) revert InvalidAmount();

        uint256 scaledBalance = balanceOf(onBehalfOf);
        bool isFirstMint = scaledBalance == 0;

        uint256 balanceIncrease = 0;
        if (_userState[onBehalfOf].index != 0 && _userState[onBehalfOf].index < index) {
            balanceIncrease = scaledBalance.rayMul(index) - scaledBalance.rayMul(_userState[onBehalfOf].index);
        }

        _userState[onBehalfOf].index = index.toUint128();

        _mint(onBehalfOf, amountToMint.toUint128());

        emit Mint(caller, onBehalfOf, amountToMint, index);

        return (isFirstMint, amountToMint, totalSupply(), amountScaled);
    }

    /**
     * @notice Burns RToken from a user and transfers underlying asset
     * @param from The address from which tokens are burned
     * @param receiverOfUnderlying The address receiving the underlying asset
     * @param amount The amount to burn (in underlying asset units)
     * @param index The liquidity index at the time of burning
     * @return A tuple containing:
     *         - uint256: The amount of scaled tokens burned
     *         - uint256: The new total supply after burning
     *         - uint256: The amount of underlying asset transferred
     */
    function burn(
        address from,
        address receiverOfUnderlying,
        uint256 amount,
        uint256 index
    ) external override onlyReservePool returns (uint256, uint256, uint256) {
        if (amount == 0) {
            return (0, totalSupply(), 0);
        }

        uint256 userBalance = balanceOf(from);  

        _userState[from].index = index.toUint128();

        if(amount > userBalance){
            amount = userBalance;
        }

        uint256 amountScaled = amount.rayMul(index);

        _userState[from].index = index.toUint128();

        _burn(from, amount.toUint128());

        if (receiverOfUnderlying != address(this)) {
            IERC20(_assetAddress).safeTransfer(receiverOfUnderlying, amount);
        }

        emit Burn(from, receiverOfUnderlying, amount, index);

        return (amount, totalSupply(), amount);
    }
    
    // VIEW FUNCTIONS

    /**
     * @notice Returns the scaled balance of the user
     * @param account The address of the user
     * @return The user's balance (scaled by the liquidity index)
     */
    function balanceOf(address account) public view override(ERC20, IERC20) returns (uint256) {
        uint256 scaledBalance = super.balanceOf(account);
        return scaledBalance.rayMul(ILendingPool(_reservePool).getNormalizedIncome());
    }

    /**
     * @notice Returns the scaled total supply
     * @return The total supply (scaled by the liquidity index)
     */
    function totalSupply() public view override(ERC20, IERC20) returns (uint256) {
        return super.totalSupply().rayMul(ILendingPool(_reservePool).getNormalizedIncome());
    }

    /**
     * @dev Overrides the ERC20 transfer function to use scaled amounts
     * @param recipient The recipient address
     * @param amount The amount to transfer (in underlying asset units)
     */
    function transfer(address recipient, uint256 amount) public override(ERC20, IERC20) returns (bool) {
        uint256 scaledAmount = amount.rayDiv(ILendingPool(_reservePool).getNormalizedIncome());
        return super.transfer(recipient, scaledAmount);
    }

    /**
     * @dev Overrides the ERC20 transferFrom function to use scaled amounts
     * @param sender The sender address
     * @param recipient The recipient address
     * @param amount The amount to transfer (in underlying asset units)
     */
    function transferFrom(address sender, address recipient, uint256 amount) public override(ERC20, IERC20) returns (bool) {
        uint256 scaledAmount = amount.rayDiv(_liquidityIndex);
        return super.transferFrom(sender, recipient, scaledAmount);
    }

    /**
     * @notice Returns the liquidity index
     * @return The liquidity index
     */
    function getLiquidityIndex() external view override returns (uint256) {
        return _liquidityIndex;
    }

    /**
     * @notice Returns the Reserve Pool address
     * @return The Reserve Pool address
     */
    function getReservePool() external view returns (address) {
        return _reservePool;
    }

    /**
     * @notice Returns the non-scaled balance of the user
     * @param user The address of the user
     * @return The user's non-scaled balance
     */
    function scaledBalanceOf(address user) external view returns (uint256) {
        return super.balanceOf(user);
    }

    /**
     * @notice Returns the non-scaled total supply
     * @return The non-scaled total supply
     */
    function scaledTotalSupply() external view returns (uint256) {
        return super.totalSupply();
    }

    // BURNER / MINTER FUNCTIONS

    /**
     * @notice Sets the burner address
     * @param burner The address of the burner
     */
    function setBurner(address burner) external onlyOwner {
        if (burner == address(0)) revert InvalidAddress();
        _burner = burner;
        emit BurnerSet(_burner);
    }

    /**
     * @notice Sets the minter address
     * @param minter The address of the minter
     */
    function setMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert InvalidAddress();
        _minter = minter;
        emit MinterSet(_minter);
    }

    /**
     * @notice Returns the asset address
     * @return The asset address
     */
    function getAssetAddress() external view returns (address) {
        return _assetAddress;
    }

    /**
     * @notice Transfers the underlying asset to the specified user
     * @param user The address of the user to receive the asset
     * @param amount The amount of the asset to transfer
     */
    function transferAsset(address user, uint256 amount) external override onlyReservePool {
        IERC20(_assetAddress).safeTransfer(user, amount);
    }


    /**
     * @dev Internal function to handle token transfers, mints, and burns
     * @param from The sender address
     * @param to The recipient address
     * @param amount The amount of tokens
     */
    function _update(address from, address to, uint256 amount) internal override {
        // Scale amount by normalized income for all operations (mint, burn, transfer)
        uint256 scaledAmount = amount.rayDiv(ILendingPool(_reservePool).getNormalizedIncome());
        super._update(from, to, scaledAmount);
    }

    /**
     * @notice Calculate the dust amount in the contract
     * @return The amount of dust in the contract
     */
    function calculateDustAmount() public view returns (uint256) {
        // Calculate the actual balance of the underlying asset held by this contract
        uint256 contractBalance = IERC20(_assetAddress).balanceOf(address(this)).rayDiv(ILendingPool(_reservePool).getNormalizedIncome());

        // Calculate the total real obligations to the token holders
        uint256 currentTotalSupply = totalSupply();

        // Calculate the total real balance equivalent to the total supply
        uint256 totalRealBalance = currentTotalSupply.rayMul(ILendingPool(_reservePool).getNormalizedIncome());
        // All balance, that is not tied to rToken are dust (can be donated or is the rest of exponential vs linear)
        return contractBalance <= totalRealBalance ? 0 : contractBalance - totalRealBalance;
    }

    /**
     * @notice Rescue tokens mistakenly sent to this contract
     * @dev Only callable by the Reserve Pool. Cannot rescue the main asset.
     * @param tokenAddress The address of the ERC20 token
     * @param recipient The address to send the rescued tokens to
     * @param amount The amount of tokens to rescue
     */
    function rescueToken(address tokenAddress, address recipient, uint256 amount) external onlyReservePool {
        if (recipient == address(0)) revert InvalidAddress();
        if (tokenAddress == _assetAddress) revert CannotRescueMainAsset();
        IERC20(tokenAddress).safeTransfer(recipient, amount);
    }

    /**
     * @notice Allows the Reserve Pool to transfer accrued token dust
     * @dev Only callable by the Reserve Pool
     * @param recipient The address to send the accrued dust to
     * @param amount The requested amount to transfer (will be capped at actual dust amount)
     *
     * Limits transfer to actual dust amount
     */
    function transferAccruedDust(address recipient, uint256 amount) external onlyReservePool {
        if (recipient == address(0)) revert InvalidAddress();

        uint256 poolDustBalance = calculateDustAmount();
        if(poolDustBalance == 0) revert NoDust();

        // Cap the transfer amount to the actual dust balance
        uint256 transferAmount = (amount < poolDustBalance) ? amount : poolDustBalance;

        // Transfer the amount to the recipient
        IERC20(_assetAddress).safeTransfer(recipient, transferAmount);

        emit DustTransferred(recipient, transferAmount);
    }

    /**
     * @notice Returns the number of decimals used to get its user representation.
     * @return The number of decimals.
     */
    function decimals() public view virtual override(ERC20, IRToken) returns (uint8) {
        return super.decimals();
    }
}
