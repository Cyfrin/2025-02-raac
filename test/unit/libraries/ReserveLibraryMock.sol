// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../contracts/libraries/pools/ReserveLibrary.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ReserveLibraryMock is ReentrancyGuard {
    using ReserveLibrary for ReserveLibrary.ReserveData;

    ReserveLibrary.ReserveData private reserveData;

    function deposit(uint256 amount) external nonReentrant {
        reserveData.deposit(amount);
}   

    function withdraw(uint256 amount) external nonReentrant {
        reserveData.withdraw(amount);
    }

    function setPrimeRate(uint256 newPrimeRate) external {
        reserveData.primeRate = newPrimeRate;
    }

    function updateReserveInterests() external {
        reserveData.updateReserveInterests();
    }

    function getReserveData() external view returns (ReserveLibrary.ReserveData memory) {
        return reserveData;
    }

    function calculateUtilizationRate() external view returns (uint256) {
        return reserveData.calculateUtilizationRate();
    }

    function transferLiquidity(address to, uint256 amount) external {
        require(amount <= reserveData.totalLiquidity, "Insufficient liquidity");
        // Implement transfer logic if needed
        reserveData.totalLiquidity -= amount;
        // For testing, you might not need actual transfer logic
    }
}