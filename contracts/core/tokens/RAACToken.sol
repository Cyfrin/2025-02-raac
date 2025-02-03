// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../../libraries/math/PercentageMath.sol";
import "../../interfaces/core/tokens/IRAACToken.sol";

/**
 * @title RAACToken
 * @notice Implementation of the RAAC token with tax mechanisms and whitelisting
 * @dev This contract implements swap and burn taxes, whitelisting, and uses WadRayMath and PercentageMath libraries
 */
contract RAACToken is ERC20, Ownable, IRAACToken {
    using PercentageMath for uint256;

    uint256 public swapTaxRate = 100;  // 1% swap tax (100 basis points)
    uint256 public burnTaxRate = 50; // 0.5% burn tax (50 basis points)
    address public feeCollector;
    address public minter;

    uint256 public constant MAX_TAX_RATE = 1000; // 10%
    uint256 public constant BASE_INCREMENT_LIMIT = 1000; // 10% in basis points
    uint256 public taxRateIncrementLimit = BASE_INCREMENT_LIMIT;

    mapping(address => bool) public whitelistAddress;

    modifier onlyMinter() {
        if (msg.sender != minter) revert OnlyMinterCanMint();
        _;
    }

    /**
     * @dev Constructor that initializes the RAAC token
     * @param initialOwner The address of the initial owner
     * @param initialSwapTaxRate The initial swap tax rate (in basis points)
     * @param initialBurnTaxRate The initial burn tax rate (in basis points)
     */
    constructor(
        address initialOwner,
        uint256 initialSwapTaxRate,
        uint256 initialBurnTaxRate
    ) ERC20("RAAC Token", "RAAC") Ownable(initialOwner) {
        if (initialOwner == address(0)) revert InvalidAddress();
        feeCollector = initialOwner;
        
        if (initialSwapTaxRate > MAX_TAX_RATE) revert SwapTaxRateExceedsLimit();
        swapTaxRate = initialSwapTaxRate == 0 ? 100 : initialSwapTaxRate; // default to 1% if 0
        emit SwapTaxRateUpdated(swapTaxRate);
        
        if (initialBurnTaxRate > MAX_TAX_RATE) revert BurnTaxRateExceedsLimit();
        burnTaxRate = initialBurnTaxRate == 0 ? 50 : initialBurnTaxRate; // default to 0.5% if 0
        emit BurnTaxRateUpdated(burnTaxRate);
    }

    /**
     * @dev Sets the minter address
     * @param _minter The address of the new minter
     */
    function setMinter(address _minter) external onlyOwner {
        if (_minter == address(0)) revert InvalidAddress();
        minter = _minter;
        emit MinterSet(_minter);
    }

    /**
     * @dev Mints new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyMinter {
        if (to == address(0)) revert InvalidAddress();
        _mint(to, amount);
    }

    /**
     * @dev Burns tokens from the caller's balance
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) external {
        uint256 taxAmount = amount.percentMul(burnTaxRate);
        _burn(msg.sender, amount - taxAmount);
        if (taxAmount > 0 && feeCollector != address(0)) {
            _transfer(msg.sender, feeCollector, taxAmount);
        }
    }

    /**
     * @dev Sets the fee collector address
     * @param _feeCollector The address of the new fee collector
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        // Fee collector can be set to zero address to disable fee collection
        if(feeCollector == address(0) && _feeCollector != address(0)){
            emit FeeCollectionEnabled(_feeCollector);
        }
        if (_feeCollector == address(0)){
            emit FeeCollectionDisabled();
        }
        
        feeCollector = _feeCollector;
        emit FeeCollectorSet(_feeCollector);
    }

    /**
     * @dev Sets the swap tax rate
     * @param rate The new swap tax rate (in basis points)
     */
    function setSwapTaxRate(uint256 rate) external onlyOwner { _setTaxRate(rate, true); }

    /**
     * @dev Sets the burn tax rate
     * @param rate The new burn tax rate (in basis points)
     */
    function setBurnTaxRate(uint256 rate) external onlyOwner { _setTaxRate(rate, false); }


    function _setTaxRate(uint256 newRate, bool isSwapTax) private {
        if (newRate > MAX_TAX_RATE) revert TaxRateExceedsLimit();
        
        uint256 currentRate = isSwapTax ? swapTaxRate : burnTaxRate;

        if (currentRate != 0) {
            uint256 maxChange = currentRate.percentMul(taxRateIncrementLimit);
            // Check if the new rate is too high (newRate > currentRate + maxChange) or too low (newRate < currentRate && currentRate - newRate > maxChange) by more than the allowed increment
            bool isTooHighOrTooLow = newRate > currentRate + maxChange || newRate < currentRate && currentRate - newRate > maxChange;

            if (isTooHighOrTooLow) {
                revert TaxRateChangeExceedsAllowedIncrement();
            }
        }

        if (isSwapTax) {
            swapTaxRate = newRate;
            emit SwapTaxRateUpdated(newRate);
        } else {
            burnTaxRate = newRate;
            emit BurnTaxRateUpdated(newRate);
        }
    }

    /**
     * @dev Sets the tax rate increment limit
     * @param limit The new increment limit (in basis points)
     */
    function setTaxRateIncrementLimit(uint256 limit) external onlyOwner {
        if (limit > BASE_INCREMENT_LIMIT) revert IncrementLimitExceedsBaseLimit();
        taxRateIncrementLimit = limit;
        emit TaxRateIncrementLimitUpdated(limit);
    }

    /**
     * @dev Adds or removes an address from the whitelist
     * @param account The address to manage in the whitelist
     * @param add A boolean indicating whether to add or remove the address
     */
    function manageWhitelist(address account, bool add) external onlyOwner {
        if (add) {
            if(account == address(0)) revert CannotWhitelistZeroAddress();
            if(whitelistAddress[account]) revert AddressAlreadyWhitelisted();
            emit AddressWhitelisted(account);
        } else {
            if(account == address(0)) revert CannotRemoveZeroAddressFromWhitelist();
            if(!whitelistAddress[account]) revert AddressNotWhitelisted();
            emit AddressRemovedFromWhitelist(account);
        }
        whitelistAddress[account] = add;
    }

    /**
     * @dev Checks if an address is whitelisted
     * @param account The address to check
     * @return A boolean indicating if the address is whitelisted
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelistAddress[account];
    }

    /**
     * @dev Internal function to update balances and apply taxes (overrides ERC20's _update)
     * @param from The address to transfer from
     * @param to The address to transfer to
     * @param amount The amount to transfer
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        uint256 baseTax = swapTaxRate + burnTaxRate;
        // Skip tax for whitelisted addresses or when fee collector disabled
        if (baseTax == 0 || from == address(0) || to == address(0) || whitelistAddress[from] || whitelistAddress[to] || feeCollector == address(0)) {
            super._update(from, to, amount);
            return;
        }

        // All other cases where tax is applied
        uint256 totalTax = amount.percentMul(baseTax);
        uint256 burnAmount = totalTax * burnTaxRate / baseTax;
        
        super._update(from, feeCollector, totalTax - burnAmount);
        super._update(from, address(0), burnAmount);
        super._update(from, to, amount - totalTax);
    }
}
