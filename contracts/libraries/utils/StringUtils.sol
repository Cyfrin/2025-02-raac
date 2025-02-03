// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title StringUtils
 * @dev Library for string operations
 */
library StringUtils {
    error NonNumericCharacter();

    /**
     * @notice Convert a numeric string to uint256
     * @dev Reverts if string contains non-numeric characters
     * @param s The string to convert
     * @return The converted uint256
     */
    function stringToUint(string memory s) internal pure returns (uint256) {
        bytes memory b = bytes(s);
        uint256 result;
        
        for (uint256 i; i < b.length; i++) {
            uint8 digit = uint8(b[i]) - 48; // Subtract ASCII value of '0'
            if (digit > 9) revert NonNumericCharacter();
            result = result * 10 + digit;
        }
        
        return result;
    }
} 