// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockPool {
    uint256 public totalSupply;
    mapping(address => uint256) public balances;
    
    function setTotalSupply(uint256 _totalSupply) external {
        totalSupply = _totalSupply;
    }
    
    function setBalance(address user, uint256 balance) external {
        balances[user] = balance;
    }
    
    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }
}
