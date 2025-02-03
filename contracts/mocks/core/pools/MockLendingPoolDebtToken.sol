// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../interfaces/core/pools/LendingPool/ILendingPool.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "../../../libraries/math/WadRayMath.sol";

contract MockLendingPoolDebtToken is ILendingPool {
    using WadRayMath for uint256;

    uint256 private _normalizedDebt;

    constructor() {
        _normalizedDebt = WadRayMath.RAY; // Initialize to 1.0 in RAY units
    }

    receive() external payable {}

    function setNormalizedDebt(uint256 newNormalizedDebt) external {
        _normalizedDebt = newNormalizedDebt;
    }

    function getNormalizedDebt() external view returns (uint256) {
        return _normalizedDebt;
    }

    function getNormalizedIncome() external pure returns (uint256) {
        return WadRayMath.RAY;
    }

    function getPrimeRate() external pure returns (uint256) {
        return 0;
    }

    function deposit(uint256) external {
        // Empty implementation
    }

    function withdraw(uint256) external {
        // Empty implementation
    }

    function borrow(uint256) external {
        // Empty implementation
    }

    function repay(uint256) external {
        // Empty implementation
    }

    function repayOnBehalf(uint256, address) external {
        // Empty implementation
    }

    function depositNFT(uint256) external {
        // Empty implementation
    }

    function withdrawNFT(uint256) external {
        // Empty implementation
    }

    function updateState() external {
        // Empty implementation
    }

    function initiateLiquidation(address) external {
        // Empty implementation
    }

    function closeLiquidation() external {
        // Empty implementation
    }

    function finalizeLiquidation(address) external {
        // Empty implementation
    }

    function calculateHealthFactor(address) external pure returns (uint256) {
        return 0;
    }

    function getUserCollateralValue(address) external pure returns (uint256) {
        return 0;
    }

    function getUserDebt(address) external pure returns (uint256) {
        return 0;
    }

    function getNFTPrice(uint256) external pure returns (uint256) {
        return 0;
    }

    function setPrimeRate(uint256) external {
        // Empty implementation
    }

    function setProtocolFeeRate(uint256) external {
        // Empty implementation
    }

    function setLiquidationThreshold(uint256) external {
        // Empty implementation
    }

    function setHealthFactorLiquidationThreshold(uint256) external {
        // Empty implementation
    }

    function setLiquidationGracePeriod(uint256) external {
        // Empty implementation
    }

    function setStabilityPool(address newStabilityPool) external override {}

    function setParameter(OwnerParameter param, uint256 newValue) external override {}

    function transferAccruedDust(address recipient, uint256 amountUnderlying) external override {}

    function pauseWithdrawals() external {
        // Empty implementation
    }

    function unpauseWithdrawals() external {
        // Empty implementation
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}