// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../../../libraries/math/WadRayMath.sol";

import "../../../interfaces/core/pools/StabilityPool/IStabilityPool.sol";
import "../../../interfaces/core/pools/LendingPool/ILendingPool.sol";
import "../../../interfaces/core/minters/RAACMinter/IRAACMinter.sol";
import "../../../interfaces/core/tokens/IRAACToken.sol";
import "../../../interfaces/core/tokens/IRToken.sol";
import "../../../interfaces/core/tokens/IDEToken.sol";

contract StabilityPool is IStabilityPool, Initializable, ReentrancyGuard, OwnableUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;
    using SafeERC20 for IRToken;
    using SafeERC20 for IDEToken;
    using SafeERC20 for IRAACToken;

    // State variables
    IRToken public rToken;
    IDEToken public deToken;
    IRAACToken public raacToken;
    ILendingPool public lendingPool;
    IERC20 public crvUSDToken;

    // Manager variables (manger can liquidate as stability pool)
    mapping(address => bool) public managers;
    // Manager value allocation / allowance
    mapping(address => uint256) public managerAllocation;
    uint256 public totalAllocation;
    address[] public managerList;

    mapping(address => uint256) public userDeposits;

    IRAACMinter public raacMinter;
    address public liquidityPool;

    mapping(address => bool) public supportedMarkets;
    mapping(address => uint256) public marketAllocations;

    uint256 public lastUpdate;
    uint256 public index = 1e18;

    address private immutable _initialOwner;

    // Allow to make rToken / deToken decimals flexible
    uint8 public rTokenDecimals;
    uint8 public deTokenDecimals;

    // Constructor
    constructor(address initialOwner) {
        _initialOwner = initialOwner;
    }

    /**
     * @notice Initializes the StabilityPool contract.
     * @param _rToken Address of the RToken contract.
     * @param _deToken Address of the DEToken contract.
     * @param _raacToken Address of the RAAC token contract.
     * @param _raacMinter Address of the RAACMinter contract.
     */
    function initialize(
        address _rToken,
        address _deToken,
        address _raacToken,
        address _raacMinter,
        address _crvUSDToken,
        address _lendingPool
    ) public initializer {
        if (_rToken == address(0) || _deToken == address(0) || _raacToken == address(0) || _raacMinter == address(0) || _crvUSDToken == address(0) || _lendingPool == address(0)) revert InvalidAddress();
        __Ownable_init(_initialOwner);
        __Pausable_init();
        rToken = IRToken(_rToken);
        deToken = IDEToken(_deToken);
        raacToken = IRAACToken(_raacToken);
        raacMinter = IRAACMinter(_raacMinter);
        crvUSDToken = IERC20(_crvUSDToken);
        lendingPool = ILendingPool(_lendingPool);

        // Get and store the decimals
        rTokenDecimals = IRToken(_rToken).decimals();
        deTokenDecimals = IDEToken(_deToken).decimals();
    }

    // Modifiers
    modifier onlyLiquidityPool() {
        if (msg.sender != liquidityPool) revert UnauthorizedAccess();
        _;
    }

    modifier validAmount(uint256 amount) {
        if (amount == 0) revert InvalidAmount();
        _;
    }

    modifier onlyManager() {
        if (!managers[msg.sender]) revert UnauthorizedAccess();
        _;
    }

    modifier onlyManagerOrOwner() {
    if (!managers[msg.sender] && msg.sender != owner()) revert UnauthorizedAccess();
        _;
    }

    /**
     * @notice Adds a new manager with a specified allocation.
     * @param manager Address of the manager to add.
     * @param allocation Allocation amount for the manager.
     */
    function addManager(address manager, uint256 allocation) external onlyOwner validAmount(allocation) {
        if (managers[manager]) revert ManagerAlreadyExists();
        managers[manager] = true;
        managerAllocation[manager] = allocation;
        totalAllocation += allocation;
        managerList.push(manager);
        emit ManagerAdded(manager, allocation);
    }

    /**
     * @notice Removes an existing manager.
     * @param manager Address of the manager to remove.
     */
    function removeManager(address manager) external onlyOwner {
        if (!managers[manager]) revert ManagerNotFound();
        totalAllocation -= managerAllocation[manager];
        delete managerAllocation[manager];
        managers[manager] = false;
        _removeManagerFromList(manager);
        emit ManagerRemoved(manager);
    }

    /**
     * @notice Updates the allocation for an existing manager.
     * @param manager Address of the manager.
     * @param newAllocation New allocation amount.
     */
    function updateAllocation(address manager, uint256 newAllocation) external onlyOwner validAmount(newAllocation) {
        if (!managers[manager]) revert ManagerNotFound();
        totalAllocation = totalAllocation - managerAllocation[manager] + newAllocation;
        managerAllocation[manager] = newAllocation;
        emit AllocationUpdated(manager, newAllocation);
    }

    /**
     * @notice Sets the RAACMinter contract address.
     * @param _raacMinter Address of the new RAACMinter contract.
     */
    function setRAACMinter(address _raacMinter) external onlyOwner {
        raacMinter = IRAACMinter(_raacMinter);
    }

    /**
     * @dev Internal function to mint RAAC rewards.
     */
    function _mintRAACRewards() internal {
        if (address(raacMinter) != address(0)) {
            raacMinter.tick();
        }
    }

    /**
     * @notice Allows a user to deposit rToken and receive deToken.
     * @param amount Amount of rToken to deposit.
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused validAmount(amount) {
        _update();
        rToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 deCRVUSDAmount = calculateDeCRVUSDAmount(amount);
        deToken.mint(msg.sender, deCRVUSDAmount);

        userDeposits[msg.sender] += amount;
        _mintRAACRewards();

        emit Deposit(msg.sender, amount, deCRVUSDAmount);
    }

    /**
     * @notice Calculates the amount of deToken to mint for a given rToken deposit.
     * @param rcrvUSDAmount Amount of rToken deposited.
     * @return Amount of deToken to mint.
     */
    function calculateDeCRVUSDAmount(uint256 rcrvUSDAmount) public view returns (uint256) {
        uint256 scalingFactor = 10**(18 + deTokenDecimals - rTokenDecimals);
        return (rcrvUSDAmount * scalingFactor) / getExchangeRate();
    }

    /**
     * @notice Calculates the amount of rToken to return for a given deToken redemption.
     * @param deCRVUSDAmount Amount of deToken to redeem.
     * @return Amount of rToken to return.
     */
    function calculateRcrvUSDAmount(uint256 deCRVUSDAmount) public view returns (uint256) {
        uint256 scalingFactor = 10**(18 + rTokenDecimals - deTokenDecimals);
        return (deCRVUSDAmount * getExchangeRate()) / scalingFactor;
    }

    /**
     * @notice Gets the current exchange rate between rToken and deToken.
     * @return Current exchange rate.
     */
    function getExchangeRate() public view returns (uint256) {
        // uint256 totalDeCRVUSD = deToken.totalSupply();
        // uint256 totalRcrvUSD = rToken.balanceOf(address(this));
        // if (totalDeCRVUSD == 0 || totalRcrvUSD == 0) return 10**18;

        // uint256 scalingFactor = 10**(18 + deTokenDecimals - rTokenDecimals);
        // return (totalRcrvUSD * scalingFactor) / totalDeCRVUSD;
        return 1e18;
    }

    /**
     * @notice Allows a user to withdraw their rToken and RAAC rewards.
     * @param deCRVUSDAmount Amount of deToken to redeem.
     */
    function withdraw(uint256 deCRVUSDAmount) external nonReentrant whenNotPaused validAmount(deCRVUSDAmount) {
        _update();
        if (deToken.balanceOf(msg.sender) < deCRVUSDAmount) revert InsufficientBalance();

        uint256 rcrvUSDAmount = calculateRcrvUSDAmount(deCRVUSDAmount);
        uint256 raacRewards = calculateRaacRewards(msg.sender);
        if (userDeposits[msg.sender] < rcrvUSDAmount) revert InsufficientBalance();
        userDeposits[msg.sender] -= rcrvUSDAmount;

        if (userDeposits[msg.sender] == 0) {
            delete userDeposits[msg.sender];
        }

        deToken.burn(msg.sender, deCRVUSDAmount);
        rToken.safeTransfer(msg.sender, rcrvUSDAmount);
        if (raacRewards > 0) {
            raacToken.safeTransfer(msg.sender, raacRewards);
        }

        emit Withdraw(msg.sender, rcrvUSDAmount, deCRVUSDAmount, raacRewards);
    }

    /**
     * @notice Calculates the pending RAAC rewards for a user.
     * @param user Address of the user.
     * @return Amount of RAAC rewards.
     */
    function calculateRaacRewards(address user) public view returns (uint256) {
        uint256 userDeposit = userDeposits[user];
        uint256 totalDeposits = deToken.totalSupply();

        uint256 totalRewards = raacToken.balanceOf(address(this));
        if (totalDeposits < 1e6) return 0;

        return (totalRewards * userDeposit) / totalDeposits;
    }

    /**
     * @notice Gets the pending RAAC rewards for a user.
     * @param user Address of the user.
     * @return Amount of pending RAAC rewards.
     */
    function getPendingRewards(address user) external view returns (uint256) {
        return calculateRaacRewards(user);
    }

    /**
     * @notice Gets the allocation for a manager.
     * @param manager Address of the manager.
     * @return Allocation amount.
     */
    function getManagerAllocation(address manager) external view returns (uint256) {
        return managerAllocation[manager];
    }

    /**
     * @notice Gets the total allocation across all managers.
     * @return Total allocation amount.
     */
    function getTotalAllocation() external view returns (uint256) {
        return totalAllocation;
    }

    /**
     * @notice Gets the deposit amount for a user.
     * @param user Address of the user.
     * @return Deposit amount.
     */
    function getUserDeposit(address user) external view returns (uint256) {
        return userDeposits[user];
    }

    /**
     * @notice Checks if an address is a manager.
     * @param manager Address to check.
     * @return True if the address is a manager, false otherwise.
     */
    function getManager(address manager) external view returns (bool) {
        return managers[manager];
    }

    /**
     * @notice Gets the list of all managers.
     * @return Array of manager addresses.
     */
    function getManagers() external view returns (address[] memory) {
        return managerList;
    }

    /**
     * @notice Sets the liquidity pool address.
     * @param _liquidityPool Address of the liquidity pool.
     */
    function setLiquidityPool(address _liquidityPool) external onlyOwner {
        liquidityPool = _liquidityPool;
        emit LiquidityPoolSet(_liquidityPool);
    }

    /**
     * @notice Deposits RAAC tokens from the liquidity pool.
     * @param amount Amount of RAAC tokens to deposit.
     */
    function depositRAACFromPool(uint256 amount) external onlyLiquidityPool validAmount(amount) {
        uint256 preBalance = raacToken.balanceOf(address(this));

        raacToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 postBalance = raacToken.balanceOf(address(this));
        if (postBalance != preBalance + amount) revert InvalidTransfer();

        // TODO: Logic for distributing to managers based on allocation

        emit RAACDepositedFromPool(msg.sender, amount);
    }

    /**
     * @notice Finds the index of a manager in the manager list.
     * @param manager Address of the manager.
     * @return Index of the manager.
     */
    function findManagerIndex(address manager) internal view returns (uint256) {
        for (uint256 i = 0; i < managerList.length; i++) {
            if (managerList[i] == manager) {
                return i;
            }
        }
        revert ManagerNotFound();
    }

    /**
     * @notice Adds a new market with a specified allocation.
     * @param market Address of the market to add.
     * @param allocation Allocation amount for the market.
     */
    function addMarket(address market, uint256 allocation) external onlyOwner validAmount(allocation) {
        if (supportedMarkets[market]) revert MarketAlreadyExists();
        supportedMarkets[market] = true;
        marketAllocations[market] = allocation;
        totalAllocation += allocation;
        emit MarketAdded(market, allocation);
    }

    /**
     * @notice Removes an existing market.
     * @param market Address of the market to remove.
     */
    function removeMarket(address market) external onlyOwner {
        if (!supportedMarkets[market]) revert MarketNotFound();
        supportedMarkets[market] = false;
        totalAllocation -= marketAllocations[market];
        delete marketAllocations[market];
        emit MarketRemoved(market);
    }

    /**
     * @notice Updates the allocation for an existing market.
     * @param market Address of the market.
     * @param newAllocation New allocation amount.
     */
    function updateMarketAllocation(address market, uint256 newAllocation) external onlyOwner validAmount(newAllocation) {
        if (!supportedMarkets[market]) revert MarketNotFound();
        totalAllocation = totalAllocation - marketAllocations[market] + newAllocation;
        marketAllocations[market] = newAllocation;
        emit MarketAllocationUpdated(market, newAllocation);
    }

    /**
     * @notice Pauses the contract.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the contract.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Gets the total deposits in the pool.
     * @return Total deposits amount.
     */
    function getTotalDeposits() external view returns (uint256) {
        return rToken.balanceOf(address(this));
    }

    /**
     * @notice Gets the balance of a user.
     * @param user Address of the user.
     * @return Deposit amount of the user.
     */
    function balanceOf(address user) external view returns (uint256) {
        return userDeposits[user];
    }

    /**
     * @dev Internal function to remove a manager from the manager list.
     * @param manager Address of the manager to remove.
     */
    function _removeManagerFromList(address manager) private {
        uint256 managerIndex = findManagerIndex(manager);
        uint256 lastIndex = managerList.length - 1;
        if (managerIndex != lastIndex) {
            managerList[managerIndex] = managerList[lastIndex];
        }
        managerList.pop();
    }

    /**
     * @dev Internal function to update state variables.
     */
    function _update() internal {
       _mintRAACRewards();
    }
    /**
     * @notice Liquidates a borrower's position.
     * @dev This function can only be called by a manager or the owner when the contract is not paused.
     * @param userAddress The address of the borrower to liquidate.
     * @custom:throws InvalidAmount If the user's debt is zero.
     * @custom:throws InsufficientBalance If the Stability Pool doesn't have enough crvUSD to cover the debt.
     * @custom:throws ApprovalFailed If the approval of crvUSD transfer to LendingPool fails.
     * @custom:emits BorrowerLiquidated when the liquidation is successful.
     */
    function liquidateBorrower(address userAddress) external onlyManagerOrOwner nonReentrant whenNotPaused {
        // Get the user's debt from the LendingPool.
        uint256 userDebt = lendingPool.getUserDebt(userAddress);
        uint256 scaledUserDebt = WadRayMath.rayMul(userDebt, lendingPool.getNormalizedDebt());

        if (userDebt == 0) revert InvalidAmount();

        uint256 crvUSDBalance = crvUSDToken.balanceOf(address(this));
        if (crvUSDBalance < scaledUserDebt) revert InsufficientBalance();

        // Approve the LendingPool to transfer the debt amount
        bool approveSuccess = crvUSDToken.approve(address(lendingPool), scaledUserDebt);
        if (!approveSuccess) revert ApprovalFailed();

        // Call finalizeLiquidation on LendingPool
        lendingPool.finalizeLiquidation(userAddress);

        emit BorrowerLiquidated(userAddress, scaledUserDebt);
    }
}
