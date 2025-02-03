// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LPToken is ERC20, Ownable {
    /**
     * @notice The address of the minter
     */
    address public minter;
    /**
     * @notice The address of the burner
     */
    address public burner;


    // ERRORS
    /**
     * @notice Emitted when the address is invalid
     */
    error InvalidAddress();

    // MODIFIERS

    /**
     * @notice Modifier to check if the caller is the minter last set by the setMinter owner function
     */
    modifier onlyMinter() {
        if (msg.sender != minter) revert InvalidAddress();
        _;
    }

    /**
     * @notice Modifier to check if the caller is the burner last set by the setBurner owner function
     */
    modifier onlyBurner() {
        if (msg.sender != burner) revert InvalidAddress();
        _;
    }

    // CONSTRUCTOR
    /**
     * @notice Constructor for the LPToken
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param initialOwner The address of the initial owner
     */
    constructor(string memory name, string memory symbol, address initialOwner) ERC20(name, symbol) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert InvalidAddress();
        minter = initialOwner;
        burner = initialOwner;
    }

    // FUNCTIONS

    /**
     * @notice Mints tokens to the specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyMinter {
        if (to == address(0)) revert InvalidAddress();
        _mint(to, amount);
    }

    /**
     * @notice Burns tokens from the specified address
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyBurner {
        if (from == address(0)) revert InvalidAddress();
        _burn(from, amount);
    }

    /**
     * @notice Sets the minter address
     * @param newMinter The address of the new minter
     */
    function setMinter(address newMinter) external onlyOwner {
        if (newMinter == address(0)) revert InvalidAddress();
        minter = newMinter;
    }

    /**
     * @notice Sets the burner address
     * @param newBurner The address of the new burner
     */
    function setBurner(address newBurner) external onlyOwner {
        if (newBurner == address(0)) revert InvalidAddress();
        burner = newBurner;
    }
}