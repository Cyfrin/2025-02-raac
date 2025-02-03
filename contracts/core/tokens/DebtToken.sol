// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../../libraries/math/WadRayMath.sol";
import "../../interfaces/core/tokens/IDebtToken.sol";
import "../../interfaces/core/pools/LendingPool/ILendingPool.sol";

/**
 * @title DebtToken
 * @notice Implementation of the debt token for the RAAC lending protocol.
 *         Users accumulate debt over time due to interest accrual, represented by the usage index.
 * @dev This contract aligns with Aave's VariableDebtToken implementation, scaling balances by the usage index.
 */
contract DebtToken is ERC20, ERC20Permit, IDebtToken, Ownable {
    using WadRayMath for uint256;
    using SafeCast for uint256;

    // Address of the Reserve Pool contract
    address private _reservePool;

    // Usage index, represents cumulative interest
    uint256 private _usageIndex;

    // Dust threshold for debt balances
    uint256 private constant DUST_THRESHOLD = 1e4;

    struct UserState {
        uint128 index;
    }

    mapping(address => UserState) private _userState;

    // EVENTS

    /**
     * @notice Emitted when the Reserve Pool address is updated
     * @param oldReservePool The old Reserve Pool address
     * @param newReservePool The new Reserve Pool address
     */
    event ReservePoolUpdated(address indexed oldReservePool, address indexed newReservePool);

    /**
     * @notice Emitted when the usage index is updated
     * @param newUsageIndex The new usage index
     */
    event UsageIndexUpdated(uint256 newUsageIndex);

    /**
     * @notice Emitted when debt tokens are minted
     * @param caller The address initiating the mint
     * @param onBehalfOf The recipient of the debt tokens
     * @param amount The amount minted (in underlying asset units)
     * @param balanceIncrease The increase in the user's debt balance
     * @param index The usage index at the time of minting
     */
    event Mint(address indexed caller, address indexed onBehalfOf, uint256 amount, uint256 balanceIncrease,uint256 index);

    /**
     * @notice Emitted when debt tokens are burned
     * @param from The address from which tokens are burned
     * @param amount The amount burned (in underlying asset units)
     * @param index The usage index at the time of burning
     */
    event Burn(address indexed from, uint256 amount, uint256 index);

    // CUSTOM ERRORS

    error OnlyReservePool();
    error InvalidAddress();
    error InvalidAmount();
    error InsufficientBalance();
    error TransfersNotAllowed();

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
     * @dev Initializes the DebtToken contract with the given parameters
     * @param name The name of the token
     * @param symbol The symbol of the token
     */
   
    constructor(string memory name, string memory symbol, address initialOwner) ERC20(name, symbol) ERC20Permit(name) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert InvalidAddress();
        _usageIndex = uint128(WadRayMath.RAY);
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
     * @notice Updates the usage index
     * @param newUsageIndex The new usage index
     */
    function updateUsageIndex(uint256 newUsageIndex) external override onlyReservePool {
        if (newUsageIndex < _usageIndex) revert InvalidAmount();
        _usageIndex = newUsageIndex;
        emit UsageIndexUpdated(newUsageIndex);
    }

    /**
     * @notice Mints debt tokens to a user
     * @param user The address initiating the mint
     * @param onBehalfOf The recipient of the debt tokens
     * @param amount The amount to mint (in underlying asset units)
     * @param index The usage index at the time of minting
     * @return A tuple containing:
     *         - bool: True if the previous balance was zero
     *         - uint256: The amount of scaled tokens minted
     *         - uint256: The new total supply after minting
     */
    function mint(
        address user,
        address onBehalfOf,
        uint256 amount,
        uint256 index
    )  external override onlyReservePool returns (bool, uint256, uint256) {
        if (user == address(0) || onBehalfOf == address(0)) revert InvalidAddress();
        if (amount == 0) {
            return (false, 0, totalSupply());
        }

        uint256 amountScaled = amount.rayDiv(index);
        if (amountScaled == 0) revert InvalidAmount();

        uint256 scaledBalance = balanceOf(onBehalfOf);
        bool isFirstMint = scaledBalance == 0;

        uint256 balanceIncrease = 0;
        if (_userState[onBehalfOf].index != 0 && _userState[onBehalfOf].index < index) {
            balanceIncrease = scaledBalance.rayMul(index) - scaledBalance.rayMul(_userState[onBehalfOf].index);
        }

        _userState[onBehalfOf].index = index.toUint128();

        uint256 amountToMint = amount + balanceIncrease;

        _mint(onBehalfOf, amountToMint.toUint128());

        emit Transfer(address(0), onBehalfOf, amountToMint);
        emit Mint(user, onBehalfOf, amountToMint, balanceIncrease, index);

        return (scaledBalance == 0, amountToMint, totalSupply());
    }

   /**
     * @notice Burns debt tokens from a user
     * @param from The address from which tokens are burned
     * @param amount The amount to burn (in underlying asset units)
     * @param index The usage index at the time of burning
     * @return A tuple containing:
     *         - uint256: The amount of scaled tokens burned
     *         - uint256: The new total supply after burning
     *         - uint256: The amount of underlying tokens burned
     *         - uint256: The balance increase due to interest
     */
    function burn(
        address from,
        uint256 amount,
        uint256 index
    ) external override onlyReservePool returns (uint256, uint256, uint256, uint256) {
        if (from == address(0)) revert InvalidAddress();
        if (amount == 0) {
            return (0, totalSupply(), 0, 0);
        }

        uint256 userBalance = balanceOf(from);  

        uint256 balanceIncrease = 0;
        if (_userState[from].index != 0 && _userState[from].index < index) {
            uint256 borrowIndex = ILendingPool(_reservePool).getNormalizedDebt();
            balanceIncrease = userBalance.rayMul(borrowIndex) - userBalance.rayMul(_userState[from].index);
            amount = amount;
        }

        _userState[from].index = index.toUint128();

        if(amount > userBalance){
            amount = userBalance;
        } 
        
        uint256 amountScaled = amount.rayDiv(index);

        if (amountScaled == 0) revert InvalidAmount();

        _burn(from, amount.toUint128());
        emit Burn(from, amountScaled, index);

        return (amount, totalSupply(), amountScaled, balanceIncrease);
    }

    // VIEW FUNCTIONS

    /**
     * @notice Returns the scaled debt balance of the user
     * @param account The address of the user
     * @return The user's debt balance (scaled by the usage index)
     */
    function balanceOf(address account) public view override(ERC20, IERC20) returns (uint256) {
        uint256 scaledBalance = super.balanceOf(account);
        return scaledBalance.rayMul(ILendingPool(_reservePool).getNormalizedDebt());
    }

    /**
     * @notice Returns the scaled total supply
     * @return The total supply (scaled by the usage index)
     */
    function totalSupply() public view override(ERC20, IERC20) returns (uint256) {
        uint256 scaledSupply = super.totalSupply();
        return scaledSupply.rayDiv(ILendingPool(_reservePool).getNormalizedDebt());
    }


    /**
     * @notice Returns the usage index
     * @return The usage index
     */
    function getUsageIndex() external view override returns (uint256) {
        return _usageIndex;
    }

    /**
     * @notice Returns the Reserve Pool address
     * @return The Reserve Pool address
     */
    function getReservePool() external view returns (address) {
        return _reservePool;
    }

    // INTERNAL FUNCTIONS

    function _update(address from, address to, uint256 amount) internal virtual override {
        if (from != address(0) && to != address(0)) {
            revert TransfersNotAllowed(); // Only allow minting and burning
        }

        uint256 scaledAmount = amount.rayDiv(ILendingPool(_reservePool).getNormalizedDebt());
        super._update(from, to, scaledAmount);
        emit Transfer(from, to, amount);
    }


    // ERC20 OVERRIDES
    
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
}