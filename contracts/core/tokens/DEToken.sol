// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../../libraries/math/WadRayMath.sol";

import "../../interfaces/core/tokens/IDEToken.sol";

/**
 * @title DEToken
 * @notice Implementation of the Debitum Emptor token for the RAAC Stability Pool.
 *         Users receive DEToken when they deposit RTokens into the Stability Pool.
 *         DEToken is redeemable 1:1 with RToken.
 * @dev This contract inherits from ERC20, ERC20Permit, IDEToken, and Ownable.
 */
contract DEToken is ERC20, ERC20Permit, IDEToken, Ownable {
    using WadRayMath for uint256;
    using SafeERC20 for IERC20;

    /// @notice Address of the Stability Pool contract
    address public stabilityPool;

    /// @notice Address of the RToken contract
    address public rTokenAddress;

    /**
     * @notice Modifier to restrict function access to only the Stability Pool
     */
    modifier onlyStabilityPool() {
        if (msg.sender != stabilityPool) revert OnlyStabilityPool();
        _;
    }

    /**
     * @notice Constructs the DEToken contract
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param initialOwner The address of the initial owner of the contract
     * @param _rTokenAddress The address of the RToken contract
     */
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        address _rTokenAddress
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(initialOwner) {
        if (_rTokenAddress == address(0)) revert InvalidAddress();
        rTokenAddress = _rTokenAddress;
    }

    /**
     * @notice Sets the address of the Stability Pool
     * @param newStabilityPool The new Stability Pool address
     * @dev Can only be called by the contract owner
     */
    function setStabilityPool(address newStabilityPool) external onlyOwner {
        if (newStabilityPool == address(0)) revert InvalidAddress();
        address oldStabilityPool = stabilityPool;
        stabilityPool = newStabilityPool;
        emit StabilityPoolUpdated(oldStabilityPool, newStabilityPool);
    }

    /**
     * @notice Mints new DETokens
     * @param to The address to receive the minted tokens
     * @param amount The amount of tokens to mint
     * @dev Can only be called by the Stability Pool
     */
    function mint(address to, uint256 amount) external override onlyStabilityPool {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        _mint(to, amount);
        emit Mint(to, amount);
    }

    /**
     * @notice Burns DETokens
     * @param from The address from which to burn tokens
     * @param amount The amount of tokens to burn
     * @dev Can only be called by the Stability Pool
     */
    function burn(address from, uint256 amount) external override onlyStabilityPool {
        if (from == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        _burn(from, amount);
        emit Burn(from, amount);
    }

    /**
     * @notice Transfers RTokens to a user
     * @param user The address of the user to receive RTokens
     * @param amount The amount of RTokens to transfer
     * @dev Can only be called by the Stability Pool
     */
    function transferAsset(address user, uint256 amount) external onlyStabilityPool {
        IERC20(rTokenAddress).safeTransfer(user, amount);
    }

    /**
     * @notice Overrides the transfer function to restrict it to the Stability Pool
     * @param recipient The address to receive the tokens
     * @param amount The amount of tokens to transfer
     * @return bool Returns true if the transfer was successful
     * @dev Can only be called by the Stability Pool
     */
    function transfer(address recipient, uint256 amount) public override(ERC20,IERC20) onlyStabilityPool returns (bool) {
        return super.transfer(recipient, amount);
    }

    /**
     * @notice Overrides the transferFrom function to restrict it to the Stability Pool
     * @param sender The address to transfer tokens from
     * @param recipient The address to receive the tokens
     * @param amount The amount of tokens to transfer
     * @return bool Returns true if the transfer was successful
     * @dev Can only be called by the Stability Pool
     */
    function transferFrom(address sender, address recipient, uint256 amount) public override(ERC20,IERC20) onlyStabilityPool returns (bool) {
        return super.transferFrom(sender, recipient, amount);
    }

    /**
     * @notice Returns the address of the Stability Pool
     * @return address The Stability Pool address
     */
    function getStabilityPool() external view returns (address) {
        return stabilityPool;
    }

    /**
     * @notice Returns the address of the RToken contract
     * @return address The RToken contract address
     */
    function getRTokenAddress() external view returns (address) {
        return rTokenAddress;
    }

    /**
     * @notice Returns the number of decimals used to get its user representation.
     * @return The number of decimals.
     */
    function decimals() public view virtual override(ERC20, IDEToken) returns (uint8) {
        return super.decimals();
    }
}
