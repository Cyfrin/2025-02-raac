// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ZENO.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ZENOFactory is Ownable {
    ZENO[] public zenos;

    mapping(address => bool) public isZENO;

    event ZENOCreated(address zenoAddress, uint256 maturityDate);

    constructor(address _initialAddress) Ownable(_initialAddress) {}

    /**
        Create a new ZENO Bond contract
        Auction is the owner of the zeno bond
     */

    function createZENOContract(
        address _usdcAddress,
        uint256 _maturityDate
    ) external onlyOwner {
        string memory id = Strings.toString(zenos.length + 1);
        string memory name = string(abi.encodePacked("ZENO Bond ", id));
        string memory symbol = string(abi.encodePacked("ZENO", id));

        ZENO newZENO = new ZENO(
            _usdcAddress,
            _maturityDate,
            name,
            symbol,
            address(this)
        );

        zenos.push(newZENO);
        isZENO[address(newZENO)] = true;

        emit ZENOCreated(address(newZENO), _maturityDate);
    }

    /**
        Get all ZENO Bonds
     */

    function getZENOs() external view returns (ZENO[] memory) {
        return zenos;
    }

    /**
        Get a specific ZENO Bond
     */

    function getZENO(uint256 index) external view returns (ZENO) {
        return zenos[index];
    }

    /**
        Get the number of ZENO Bonds
     */

    function getZENOCount() external view returns (uint256) {
        return zenos.length;
    }

    function getZENODetails(
        uint256 index
    ) external view returns (ZENO.ZENODetails memory) {
        ZENO zeno = zenos[index];
        return zeno.getDetails();
    }

    /**
        Function to change the owner of the ZENO Bond to the auction contract
     */

    function transferZenoOwnership(
        uint256 index,
        address newOwner
    ) external onlyOwner {
        ZENO zeno = zenos[index];
        zeno.transferOwnership(newOwner);
    }
}
