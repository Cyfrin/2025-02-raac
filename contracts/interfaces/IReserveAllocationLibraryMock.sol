// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libraries/pools/ReserveLibrary.sol";

interface IReserveAllocationLibraryMock {
    function addLiquidity(uint256 amount) external;

    function borrow(uint256 amount, address user, address onBehalfOf) external returns (uint256, uint256);

    function repay(uint256 amount, address user, address onBehalfOf) external returns (uint256, uint256);

    function allocateFunds(uint256 amount, address recipient) external;

    function setPrimeRate(uint256 newPrimeRate) external;

    function getReserveData() external view returns (ReserveLibrary.ReserveData memory);

    function getRateData() external view returns (ReserveLibrary.ReserveRateData memory);

    function calculateUtilizationRate() external view returns (uint256);
}