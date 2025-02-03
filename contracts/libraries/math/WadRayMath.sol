// SPDX-License-Identifier: MIT
// Change date: 2023-01-27: https://github.com/aave/aave-v3-core/blob/master/LICENSE.md
// Modified by RAAC: 2024-07-25 to add rayPow function + rayExp Taylor series
pragma solidity ^0.8.0;

/**
 * @title WadRayMath library
 * @author Aave
 * @notice Provides functions to perform calculations with Wad and Ray units
 * @dev Provides mul and div function for wads (decimal numbers with 18 digits of precision) and rays (decimal numbers
 * with 27 digits of precision)
 * @dev Operations are rounded. If a value is >=.5, will be rounded up, otherwise rounded down.
 */
library WadRayMath {
  // HALF_WAD and HALF_RAY expressed with extended notation as constant with operations are not supported in Yul assembly
  uint256 internal constant WAD = 1e18;
  uint256 internal constant HALF_WAD = 0.5e18;

  uint256 internal constant RAY = 1e27;
  uint256 internal constant HALF_RAY = 0.5e27;

  uint256 internal constant WAD_RAY_RATIO = 1e9;

  uint256 internal constant SECONDS_PER_YEAR = 365 days;
  /**
   * @dev Multiplies two wad, rounding half up to the nearest wad
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Wad
   * @param b Wad
   * @return c = a*b, in wad
   */
  function wadMul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - HALF_WAD) / b
    assembly {
      if iszero(or(iszero(b), iszero(gt(a, div(sub(not(0), HALF_WAD), b))))) {
        revert(0, 0)
      }

      c := div(add(mul(a, b), HALF_WAD), WAD)
    }
  }

  /**
   * @dev Divides two wad, rounding half up to the nearest wad
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Wad
   * @param b Wad
   * @return c = a/b, in wad
   */
  function wadDiv(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - halfB) / WAD
    assembly {
      if or(iszero(b), iszero(iszero(gt(a, div(sub(not(0), div(b, 2)), WAD))))) {
        revert(0, 0)
      }

      c := div(add(mul(a, WAD), div(b, 2)), b)
    }
  }

  /**
   * @notice Multiplies two ray, rounding half up to the nearest ray
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Ray
   * @param b Ray
   * @return c = a raymul b
   */
  function rayMul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - HALF_RAY) / b
    assembly {
      if iszero(or(iszero(b), iszero(gt(a, div(sub(not(0), HALF_RAY), b))))) {
        revert(0, 0)
      }

      c := div(add(mul(a, b), HALF_RAY), RAY)
    }
  }

  /**
   * @notice Divides two ray, rounding half up to the nearest ray
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Ray
   * @param b Ray
   * @return c = a raydiv b
   */
  function rayDiv(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - halfB) / RAY
    assembly {
      if or(iszero(b), iszero(iszero(gt(a, div(sub(not(0), div(b, 2)), RAY))))) {
        revert(0, 0)
      }

      c := div(add(mul(a, RAY), div(b, 2)), b)
    }
  }

  /**
   * @dev Casts ray down to wad
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Ray
   * @return b = a converted to wad, rounded half up to the nearest wad
   */
  function rayToWad(uint256 a) internal pure returns (uint256 b) {
    assembly {
      b := div(a, WAD_RAY_RATIO)
      let remainder := mod(a, WAD_RAY_RATIO)
      if iszero(lt(remainder, div(WAD_RAY_RATIO, 2))) {
        b := add(b, 1)
      }
    }
  }

  /**
   * @dev Converts wad up to ray
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Wad
   * @return b = a converted in ray
   */
  function wadToRay(uint256 a) internal pure returns (uint256 b) {
    // to avoid overflow, b/WAD_RAY_RATIO == a
    assembly {
      b := mul(a, WAD_RAY_RATIO)

      if iszero(eq(div(b, WAD_RAY_RATIO), a)) {
        revert(0, 0)
      }
    }
  }

  /**
   * @dev Calculates the power of a ray, rounding half up to the nearest ray
   * @param x Ray
   * @param n Exponent
   * @return z = x^n, in ray
   */
  function rayPow(uint256 x, uint256 n) internal pure returns (uint256 z) {
        z = n % 2 != 0 ? x : WadRayMath.RAY;
        for (n /= 2; n != 0; n /= 2) {
            x = rayMul(x, x);
            if (n % 2 != 0) {
                z = rayMul(z, x);
            }
        }
    }

    /**
     * @dev Calculates the natural exponentiation of a ray, e^x
     * @param x Ray
     * @return z = e^x, in ray
     */
    function rayExp(uint256 x) internal pure returns (uint256 z) {
        if(x == 0) {
            return WadRayMath.RAY;
        }
        
        // Compute e^x, where x is in ray units (scaled by 1e27)
        // assembly implementation for maximum gas efficiency
        // Using a fixed number of terms for the Taylor series expansion
        assembly {
            // Initialize result with 1 in ray units (1e27)
            let result := 1000000000000000000000000000

            // First term: 1 + x
            result := add(result, x)

            // Second term: x^2 / 2!
            let term := div(mul(x, x), 2000000000000000000000000000) // x^2 / 2e27
            result := add(result, term)

            // Third term: x^3 / 3!
            term := div(mul(x, term), 3000000000000000000000000000) // x^3 / 6e27
            result := add(result, term)

            // Fourth term: x^4 / 4!
            term := div(mul(x, term), 4000000000000000000000000000) // x^4 / 24e27
            result := add(result, term)

            // Fifth term: x^5 / 5!
            term := div(mul(x, term), 5000000000000000000000000000) // x^5 / 120e27
            result := add(result, term)

            // Sixth term: x^6 / 6!
            term := div(mul(x, term), 6000000000000000000000000000) // x^6 / 720e27
            result := add(result, term)

            // Seventh term: x^7 / 7!
            term := div(mul(x, term), 7000000000000000000000000000) // x^7 / 5040e27
            result := add(result, term)

            // Assign to return value
            z := result
        }
    }
}