// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IRAACToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function setMinter(address minter) external;
    function setFeeCollector(address feeCollector) external;
    function feeCollector() external view returns (address);
    function minter() external view returns (address);
    function setSwapTaxRate(uint256 _swapTaxRate) external;
    function setBurnTaxRate(uint256 _burnTaxRate) external;
    function setTaxRateIncrementLimit(uint256 _incrementLimit) external;
    function manageWhitelist(address account, bool add) external;
    function whitelistAddress(address) external view returns (bool);
    function swapTaxRate() external view returns (uint256);
    function burnTaxRate() external view returns (uint256);
    function taxRateIncrementLimit() external view returns (uint256);

     // Events
    event MinterSet(address indexed minter);
    event FeeCollectorSet(address indexed feeCollector);
    event SwapTaxRateUpdated(uint256 newRate);
    event BurnTaxRateUpdated(uint256 newRate);
    event TaxRateIncrementLimitUpdated(uint256 newLimit);
    event AddressWhitelisted(address indexed account);
    event AddressRemovedFromWhitelist(address indexed account);
    event FeeCollectionEnabled(address indexed feeCollector);
    event FeeCollectionDisabled();

    // Errors
    error SwapTaxRateExceedsLimit();
    error BurnTaxRateExceedsLimit();
    error OnlyMinterCanMint();
    error TaxRateExceedsLimit();
    error TaxRateChangeExceedsAllowedIncrement();
    error TransferAmountExceedsAllowance();
    error IncrementLimitExceedsBaseLimit();
    error AddressNotWhitelisted();
    error FeeCollectorCannotBeZeroAddress();
    error CannotWhitelistZeroAddress();
    error AddressAlreadyWhitelisted();
    error CannotRemoveZeroAddressFromWhitelist();
    error InvalidAddress();
}