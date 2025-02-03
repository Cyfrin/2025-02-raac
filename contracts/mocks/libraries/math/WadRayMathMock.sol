// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../../libraries/math/WadRayMath.sol";

contract WadRayMathMock {
    using WadRayMath for uint256;

    function wadMul(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.wadMul(a, b);
    }

    function wadDiv(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.wadDiv(a, b);
    }

    function rayMul(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.rayMul(a, b);
    }

    function rayDiv(uint256 a, uint256 b) external pure returns (uint256) {
        return WadRayMath.rayDiv(a, b);
    }

    function rayPow(uint256 x, uint256 n) external pure returns (uint256) {
        return WadRayMath.rayPow(x, n);
    }

    function rayExp(uint256 x) external pure returns (uint256) {
        return WadRayMath.rayExp(x);
    }

    function rayToWad(uint256 a) external pure returns (uint256) {
        return WadRayMath.rayToWad(a);
    }

    function wadToRay(uint256 a) external pure returns (uint256) {
        return WadRayMath.wadToRay(a);
    }
} 