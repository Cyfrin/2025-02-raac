// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20, ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/zeno/IZENO.sol";
/**
    Keep track of the maturity date of the bond
 */
contract ZENO is IZENO, ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 public immutable USDC;
    uint256 public immutable MATURITY_DATE;

    uint256 public totalZENOMinted;
    uint256 public totalZENORedeemed;

    constructor(
        address _usdc,
        uint256 _maturityDate,
        string memory _name,
        string memory _symbol,
        address _initialOwner
    ) Ownable(_initialOwner) ERC20(_name, _symbol) {
        USDC = IERC20(_usdc);
        MATURITY_DATE = _maturityDate;
    }

    /**
    CAN BE CALLED ONLY BY ASSOCIATED AUCTION CONTRACT  (THE OWNER)
    */
    function mint(address to, uint256 amount) external onlyOwner {
        if (amount == 0) {
            revert ZeroAmount();
        }
        _mint(to, amount);
        totalZENOMinted += amount;
    }

    function isRedeemable() public view returns (bool _redeemable) {
        _redeemable = (block.timestamp >= MATURITY_DATE);
    }

    function redeem(uint amount) external nonReentrant {
        if (!isRedeemable()) {
            revert BondNotRedeemable();
        }

        if (amount == 0) {
            revert ZeroAmount();
        }

        uint256 totalAmount = balanceOf(msg.sender);
        if (amount > totalAmount) {
            revert InsufficientBalance();
        }

        totalZENORedeemed += amount;
        _burn(msg.sender, amount);
        USDC.safeTransfer(msg.sender, amount);
    }

    function redeemAll() external nonReentrant {
        if (!isRedeemable()) {
            revert BondNotRedeemable();
        }

        uint256 amount = balanceOf(msg.sender);
        totalZENORedeemed += amount;
        _burn(msg.sender, amount);
        USDC.safeTransfer(msg.sender, amount);
    }

    function getDetails() external view returns (ZENODetails memory) {
        return ZENODetails(address(this), MATURITY_DATE, name(), symbol());
    }
}
