import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("StabilityPool", function () {
  let owner, user1, user2, user3, treasury;
  let stabilityPool, lendingPool, raacMinter;
  let crvusd, rToken, deToken, raacToken, raacNFT;
  let raacHousePrices;

  beforeEach(async function () {
    [owner, user1, user2, user3, treasury] = await ethers.getSigners();

    // Deploy base tokens
    const CrvUSDToken = await ethers.getContractFactory("crvUSDToken");
    crvusd = await CrvUSDToken.deploy(owner.address);
    await crvusd.setMinter(owner.address);

    const RAACToken = await ethers.getContractFactory("RAACToken");
    raacToken = await RAACToken.deploy(owner.address, 100, 50);

    // Deploy price oracle and set oracle
    const RAACHousePrices = await ethers.getContractFactory("RAACHousePrices");
    raacHousePrices = await RAACHousePrices.deploy(owner.address);
    await raacHousePrices.setOracle(owner.address);

    // Deploy NFT
    const RAACNFT = await ethers.getContractFactory("RAACNFT");
    raacNFT = await RAACNFT.deploy(crvusd.target, raacHousePrices.target, owner.address);

    // Deploy pool tokens
    const RToken = await ethers.getContractFactory("RToken");
    rToken = await RToken.deploy("RToken", "RToken", owner.address, crvusd.target);

    const DebtToken = await ethers.getContractFactory("DebtToken");
    const debtToken = await DebtToken.deploy("DebtToken", "DT", owner.address);

    const DEToken = await ethers.getContractFactory("DEToken");
    deToken = await DEToken.deploy("DEToken", "DEToken", owner.address, rToken.target);

    // Deploy pools
    const initialPrimeRate = ethers.parseUnits("0.1", 27);
    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(
      crvusd.target,
      rToken.target,
      debtToken.target,
      raacNFT.target,
      raacHousePrices.target,
      initialPrimeRate
    );

    const StabilityPool = await ethers.getContractFactory("StabilityPool");
    stabilityPool = await StabilityPool.deploy(owner.address);

    // Deploy RAAC minter
    const RAACMinter = await ethers.getContractFactory("RAACMinter");
    raacMinter = await RAACMinter.deploy(
      raacToken.target,
      stabilityPool.target,
      lendingPool.target,
      owner.address
    );

    // Setup cross-contract references
    await lendingPool.setStabilityPool(stabilityPool.target);
    await rToken.setReservePool(lendingPool.target);
    await debtToken.setReservePool(lendingPool.target);
    await rToken.transferOwnership(lendingPool.target);
    await debtToken.transferOwnership(lendingPool.target);
    
    await deToken.setStabilityPool(stabilityPool.target);
    await deToken.transferOwnership(stabilityPool.target);

    // Initialize Stability Pool
    await stabilityPool.initialize(
      rToken.target,
      deToken.target,
      raacToken.target,
      raacMinter.target,
      crvusd.target,
      lendingPool.target
    );

    // Setup permissions
    await raacToken.setMinter(raacMinter.target);
    await raacToken.addToWhitelist(stabilityPool.target);

    // Mint initial tokens and setup approvals
    const initialBalance = ethers.parseEther("1000");
    
    // Mint crvUSD to users
    await crvusd.mint(user1.address, initialBalance);
    await crvusd.mint(user2.address, initialBalance);
    await crvusd.mint(user3.address, initialBalance);
    
    // Approve crvUSD for LendingPool
    await crvusd.connect(user1).approve(lendingPool.target, initialBalance);
    await crvusd.connect(user2).approve(lendingPool.target, initialBalance);
    await crvusd.connect(user3).approve(lendingPool.target, initialBalance);

    // Initial deposits to get rTokens
    await lendingPool.connect(user1).deposit(initialBalance);
    await lendingPool.connect(user2).deposit(initialBalance);
    await lendingPool.connect(user3).deposit(initialBalance);

    // Approve rTokens for StabilityPool
    await rToken.connect(user1).approve(stabilityPool.target, initialBalance);
    await rToken.connect(user2).approve(stabilityPool.target, initialBalance);
    await rToken.connect(user3).approve(stabilityPool.target, initialBalance);
  });

  describe("Initialization", function () {
    it("should initialize with correct parameters", async function () {
      expect(await stabilityPool.rToken()).to.equal(rToken.target);
      expect(await stabilityPool.deToken()).to.equal(deToken.target);
      expect(await stabilityPool.raacToken()).to.equal(raacToken.target);
      expect(await stabilityPool.raacMinter()).to.equal(raacMinter.target);
      expect(await stabilityPool.crvUSDToken()).to.equal(crvusd.target);
      expect(await stabilityPool.lendingPool()).to.equal(lendingPool.target);
    });

    it("should fail to initialize twice", async function () {
      await expect(
        stabilityPool.initialize(
          rToken.target,
          deToken.target,
          raacToken.target,
          raacMinter.target,
          crvusd.target,
          lendingPool.target
        )
      ).to.be.revertedWithCustomError(stabilityPool, "InvalidInitialization");
    });

    it("should fail to initialize with zero addresses", async function () {
      const StabilityPool = await ethers.getContractFactory("StabilityPool");
      const newStabilityPool = await StabilityPool.deploy(owner.address);

      // Error from StabilityPool
      await expect(
        newStabilityPool.initialize(
          ethers.ZeroAddress,
          deToken.target,
          raacToken.target,
          raacMinter.target,
          crvusd.target,
          lendingPool.target
        )
      ).to.be.revertedWithCustomError(stabilityPool, "InvalidAddress");
    });
  });

  describe("Core Functionality", function () {
    describe("Deposits", function () {
      beforeEach(async function () {
        const depositAmount = ethers.parseEther("100");
        await crvusd.mint(user2.address, depositAmount);
        await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
        await lendingPool.connect(user2).deposit(depositAmount);
        await rToken.connect(user2).approve(stabilityPool.target, depositAmount);
      });

      it("should mint DEToken at correct exchange rate", async function () {
        const depositAmount = ethers.parseEther("50");
        await stabilityPool.connect(user2).deposit(depositAmount);
        
        const deTokenBalance = await deToken.balanceOf(user2.address);
        const exchangeRate = await stabilityPool.getExchangeRate();
        const expectedDETokens = depositAmount * BigInt(1e18) / exchangeRate;
        expect(deTokenBalance).to.equal(expectedDETokens);
      });

      it("should handle partial withdrawals correctly", async function () {
        const initialAmount = ethers.parseEther("100");
        await stabilityPool.connect(user2).deposit(initialAmount);
        const withdrawAmount = ethers.parseEther("30");
        
        await stabilityPool.connect(user2).withdraw(withdrawAmount);
        
        const finalBalance = await stabilityPool.getUserDeposit(user2.address);
        const expectedBalance = initialAmount - withdrawAmount;
        expect(finalBalance).to.equal(expectedBalance);
      });
    });

    describe("RAAC Rewards", function () {
      beforeEach(async function () {
        const depositAmount1 = ethers.parseEther("100");
        const depositAmount2 = ethers.parseEther("50");
        
        // Setup for user1
        await crvusd.mint(user1.address, depositAmount1);
        await crvusd.connect(user1).approve(lendingPool.target, depositAmount1);
        await lendingPool.connect(user1).deposit(depositAmount1);
        await rToken.connect(user1).approve(stabilityPool.target, depositAmount1);
        
        // Setup for user2
        await crvusd.mint(user2.address, depositAmount2);
        await crvusd.connect(user2).approve(lendingPool.target, depositAmount2);
        await lendingPool.connect(user2).deposit(depositAmount2);
        await rToken.connect(user2).approve(stabilityPool.target, depositAmount2);
      });

      it("should distribute rewards proportionally", async function () {
        await stabilityPool.connect(user1).deposit(ethers.parseEther("100"));
        await stabilityPool.connect(user2).deposit(ethers.parseEther("50"));
        
        await ethers.provider.send("evm_increaseTime", [86400]);
        await ethers.provider.send("evm_mine");
        await raacMinter.tick();
        
        const user1Rewards = await stabilityPool.calculateRaacRewards(user1.address);
        const user2Rewards = await stabilityPool.calculateRaacRewards(user2.address);
        
        // Convert to numbers for ratio calculation
        const ratio = Number(user1Rewards) / Number(user2Rewards);
        expect(ratio).to.be.closeTo(2, 0.1); // Allow 10% deviation
      });
    });

    describe("Dust Handling", function () {
      beforeEach(async function () {
        const initialAmount = ethers.parseEther("10");
        await crvusd.mint(user1.address, initialAmount);
        await crvusd.connect(user1).approve(lendingPool.target, initialAmount);
        await lendingPool.connect(user1).deposit(initialAmount);
        await rToken.connect(user1).approve(stabilityPool.target, initialAmount);
      });

      it("should handle dust amounts correctly in deposits", async function () {
        const dustAmount = ethers.parseEther("0.0000001");
        await crvusd.mint(user1.address, dustAmount);
        await crvusd.connect(user1).approve(lendingPool.target, dustAmount);
        await lendingPool.connect(user1).deposit(dustAmount);
        await rToken.connect(user1).approve(stabilityPool.target, dustAmount);
        await stabilityPool.connect(user1).deposit(dustAmount);
        
        const userDeposit = await stabilityPool.getUserDeposit(user1.address);
        expect(userDeposit).to.equal(dustAmount);
      });

      it("should handle dust amounts correctly in withdrawals", async function () {
        const initialAmount = ethers.parseEther("1");
        const dustAmount = ethers.parseEther("0.0000001");
        
        await crvusd.mint(user1.address, initialAmount);
        await crvusd.connect(user1).approve(lendingPool.target, initialAmount);
        await lendingPool.connect(user1).deposit(initialAmount);
        await rToken.connect(user1).approve(stabilityPool.target, initialAmount);
        await stabilityPool.connect(user1).deposit(initialAmount);
        
        await stabilityPool.connect(user1).withdraw(dustAmount);
        const remainingDeposit = await stabilityPool.getUserDeposit(user1.address);
        expect(remainingDeposit).to.equal(initialAmount - dustAmount);
      });

      it("should maintain precision with multiple dust operations", async function () {
        const dustAmount = ethers.parseEther("0.0000001");
        let totalDeposited = 0n;
        
        // Multiple small deposits
        for (let i = 0; i < 5; i++) {
          await crvusd.mint(user1.address, dustAmount);
          await crvusd.connect(user1).approve(lendingPool.target, dustAmount);
          await lendingPool.connect(user1).deposit(dustAmount);
          await rToken.connect(user1).approve(stabilityPool.target, dustAmount);
          await stabilityPool.connect(user1).deposit(dustAmount);
          totalDeposited += dustAmount;
        }
        
        const userDeposit = await stabilityPool.getUserDeposit(user1.address);
        expect(userDeposit).to.equal(totalDeposited);
      });
    });
  });

  describe("Market Management", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseEther("100");
      await crvusd.mint(user2.address, depositAmount);
      await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
      await lendingPool.connect(user2).deposit(depositAmount);
      await rToken.connect(user2).approve(stabilityPool.target, depositAmount);
    });

    it("should add market correctly", async function () {
      await stabilityPool.addMarket(user1.address, 100);
      expect(await stabilityPool.supportedMarkets(user1.address)).to.be.true;
      expect(await stabilityPool.marketAllocations(user1.address)).to.equal(100);
    });

    it("should fail to add existing market", async function () {
      await stabilityPool.addMarket(user1.address, 100);
      await expect(
        stabilityPool.addMarket(user1.address, 100)
      ).to.be.revertedWithCustomError(stabilityPool, "MarketAlreadyExists");
    });

    it("should remove market correctly", async function () {
      await stabilityPool.addMarket(user1.address, 100);
      await stabilityPool.removeMarket(user1.address);
      expect(await stabilityPool.supportedMarkets(user1.address)).to.be.false;
      expect(await stabilityPool.marketAllocations(user1.address)).to.equal(0);
    });

    it("should update market allocation", async function () {
      await stabilityPool.addMarket(user1.address, 100);
      await stabilityPool.updateMarketAllocation(user1.address, 200);
      expect(await stabilityPool.marketAllocations(user1.address)).to.equal(200);
    });
  });

  describe("Access Control", function () {
    it("should enforce owner restrictions", async function () {
      await expect(
        stabilityPool.connect(user1).addManager(user2.address, 100)
      ).to.be.revertedWithCustomError(stabilityPool, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to add and remove managers", async function () {
      await stabilityPool.addManager(user1.address, 100);
      expect(await stabilityPool.getManager(user1.address)).to.be.true;

      await stabilityPool.removeManager(user1.address);
      expect(await stabilityPool.getManager(user1.address)).to.be.false;
    });

    it("should enforce manager allocation limits", async function () {
      await stabilityPool.addManager(user1.address, 100);
      const allocation = await stabilityPool.getManagerAllocation(user1.address);
      expect(allocation).to.equal(100);
    });

    it("should fail to add manager with zero allocation", async function () {
      await expect(
        stabilityPool.addManager(user1.address, 0)
      ).to.be.revertedWithCustomError(stabilityPool, "InvalidAmount");
    });

    it("should update manager allocation", async function () {
      await stabilityPool.addManager(user1.address, 100);
      await stabilityPool.updateAllocation(user1.address, 200);
      expect(await stabilityPool.getManagerAllocation(user1.address)).to.equal(200);
    });

    it("should fail to update non-existent manager", async function () {
      await expect(
        stabilityPool.updateAllocation(user1.address, 200)
      ).to.be.revertedWithCustomError(stabilityPool, "ManagerNotFound");
    });
  });

  describe("Emergency Functions", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseEther("50");
      await crvusd.mint(user2.address, depositAmount);
      await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
      await lendingPool.connect(user2).deposit(depositAmount);
      await rToken.connect(user2).approve(stabilityPool.target, depositAmount);
    });

    it("should allow owner to pause and unpause", async function () {
      await stabilityPool.pause();
      expect(await stabilityPool.paused()).to.be.true;
      
      await expect(
        stabilityPool.connect(user1).deposit(ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(stabilityPool, "EnforcedPause");
      
      await stabilityPool.unpause();
      expect(await stabilityPool.paused()).to.be.false;
    });

    it("should prevent all operations when paused", async function () {
      await stabilityPool.pause();
      
      await expect(
        stabilityPool.connect(user1).deposit(ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(stabilityPool, "EnforcedPause");
      
      await expect(
        stabilityPool.connect(user1).withdraw(ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(stabilityPool, "EnforcedPause");
      
      await expect(
        stabilityPool.liquidateBorrower(user1.address)
      ).to.be.revertedWithCustomError(stabilityPool, "EnforcedPause");
    });

    it("should maintain state after pause and unpause", async function () {
      // Make initial deposit
      await stabilityPool.connect(user2).deposit(ethers.parseEther("50"));
      const balanceBefore = await stabilityPool.getUserDeposit(user2.address);
      
      // Pause and unpause
      await stabilityPool.pause();
      await stabilityPool.unpause();
      
      // Check balance remains unchanged
      const balanceAfter = await stabilityPool.getUserDeposit(user2.address);
      expect(balanceAfter).to.equal(balanceBefore);
    });
  });

  describe("Exchange Rate", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseEther("100");
      await crvusd.mint(user2.address, depositAmount);
      await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
      await lendingPool.connect(user2).deposit(depositAmount);
      await rToken.connect(user2).approve(stabilityPool.target, depositAmount);
    });

    it("should maintain correct exchange rate after interest accrual", async function () {
      await stabilityPool.connect(user2).deposit(ethers.parseEther("100"));
      
      // Simulate interest accrual
      await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 7 days
      await ethers.provider.send("evm_mine");
      await raacMinter.tick();
      
      const exchangeRate = await stabilityPool.getExchangeRate();
      expect(exchangeRate).to.equal(ethers.parseUnits("1", 18)); // Exchange rate is fixed at 1:1
    });

    it("should handle exchange rate precision correctly", async function () {
      const smallAmount = ethers.parseEther("0.0001");
      
      // Mint and approve additional tokens for small amount
      await crvusd.mint(user2.address, smallAmount);
      await crvusd.connect(user2).approve(lendingPool.target, smallAmount);
      
      await lendingPool.connect(user2).deposit(smallAmount);
      await rToken.connect(user2).approve(stabilityPool.target, smallAmount);
      await stabilityPool.connect(user2).deposit(smallAmount);
      
      const deTokenBalance = await deToken.balanceOf(user2.address);
      expect(deTokenBalance).to.equal(smallAmount); // 1:1 exchange rate
    });

    it("should maintain exchange rate consistency across multiple operations", async function () {
      // Initial deposit
      await stabilityPool.connect(user2).deposit(ethers.parseEther("50"));
      const initialRate = await stabilityPool.getExchangeRate();
      
      // Simulate some time passing
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");
      await raacMinter.tick();
      
      // Additional deposit
      await stabilityPool.connect(user2).deposit(ethers.parseEther("50"));
      const finalRate = await stabilityPool.getExchangeRate();
      
      expect(finalRate).to.be.gte(initialRate);
    });
  });

  describe("RAACMinter Integration", function () {
    beforeEach(async function () {
      const depositAmount = ethers.parseEther("100");
      
      // Setup for user1
      await crvusd.mint(user1.address, depositAmount);
      await crvusd.connect(user1).approve(lendingPool.target, depositAmount);
      await lendingPool.connect(user1).deposit(depositAmount);
      await rToken.connect(user1).approve(stabilityPool.target, depositAmount);

      // Setup for user2
      await crvusd.mint(user2.address, depositAmount);
      await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
      await lendingPool.connect(user2).deposit(depositAmount);
      await rToken.connect(user2).approve(stabilityPool.target, depositAmount);
    });

    it("should handle minting rate changes correctly", async function () {
      await stabilityPool.connect(user1).deposit(ethers.parseEther("100"));
      
      // Wait for minimum time between rate updates
      await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 7 days
      await ethers.provider.send("evm_mine");
      
      // Change minting rate
      await raacMinter.updateEmissionRate();
      
      // Advance time and check rewards
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");
      await raacMinter.tick();
      
      const rewards = await stabilityPool.calculateRaacRewards(user1.address);
      expect(rewards).to.be.gt(0);
    });

    it("should handle minter pausing correctly", async function () {
      await stabilityPool.connect(user1).deposit(ethers.parseEther("100"));
      
      const rewardsBefore = await stabilityPool.calculateRaacRewards(user1.address);
      await raacMinter.pause(true, 0);
      
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");
      
      const rewardsAfter = await stabilityPool.calculateRaacRewards(user1.address);
      expect(rewardsAfter).to.equal(rewardsBefore);
      
      // Cleanup
      await raacMinter.unpause(true, 0);
    });

    it("should distribute rewards proportionally after rate change", async function () {
      // Initial deposits
      await stabilityPool.connect(user1).deposit(ethers.parseEther("100"));
      await stabilityPool.connect(user2).deposit(ethers.parseEther("50"));
      
      // Wait for minimum time between rate updates
      await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 7 days
      await ethers.provider.send("evm_mine");
      
      // Change rate and accumulate rewards
      await raacMinter.updateEmissionRate();
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");
      await raacMinter.tick();
      
      const user1Rewards = await stabilityPool.calculateRaacRewards(user1.address);
      const user2Rewards = await stabilityPool.calculateRaacRewards(user2.address);
      
      // User1 should have ~2x the rewards of User2
      expect(user1Rewards).to.be.gt(user2Rewards);
      const ratio = Number(user1Rewards) / Number(user2Rewards);
      expect(ratio).to.be.closeTo(2, 0.1); // Allow 10% deviation
    });
  });

  describe("Market Management Edge Cases", function () {
    beforeEach(async function () {
      // Initial setup with proper allowances
      const depositAmount = ethers.parseEther("100");
      
      // Mint crvUSD to user2
      await crvusd.mint(user2.address, depositAmount);
      await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
      
      // Make initial deposit to get rTokens
      await lendingPool.connect(user2).deposit(depositAmount);
      
      // Approve rTokens for StabilityPool
      await rToken.connect(user2).approve(stabilityPool.target, depositAmount);
      
      // Make initial deposit to StabilityPool
      await stabilityPool.connect(user2).deposit(depositAmount);
    });

    it("should handle market removal with active deposits", async function () {
      const marketAllocation = ethers.parseEther("100");
      await stabilityPool.addMarket(user1.address, marketAllocation);
      
      await stabilityPool.removeMarket(user1.address);
      const marketInfo = await stabilityPool.supportedMarkets(user1.address);
      expect(marketInfo).to.be.false;
      expect(await stabilityPool.marketAllocations(user1.address)).to.equal(0);
    });

    it("should handle market allocation updates with active deposits", async function () {
      const initialAllocation = ethers.parseEther("100");
      const newAllocation = ethers.parseEther("200");
      
      await stabilityPool.addMarket(user1.address, initialAllocation);
      await stabilityPool.updateMarketAllocation(user1.address, newAllocation);
      
      expect(await stabilityPool.marketAllocations(user1.address)).to.equal(newAllocation);
    });

    it("should handle market removal and reallocation correctly", async function () {
      const allocation = ethers.parseUnits("300", 18);
      
      // Add initial markets
      await stabilityPool.addMarket(user1.address, allocation);
      await stabilityPool.addMarket(user2.address, allocation);
      
      const initialTotalAllocation = await stabilityPool.totalAllocation();
      
      // Remove first market
      await stabilityPool.removeMarket(user1.address);
      expect(await stabilityPool.marketAllocations(user1.address)).to.equal(0);
      
      // Add new market with freed allocation
      await stabilityPool.addMarket(user3.address, allocation);
      expect(await stabilityPool.marketAllocations(user3.address)).to.equal(allocation);
      
      // Check total allocation remains the same
      expect(await stabilityPool.totalAllocation()).to.equal(initialTotalAllocation);
    });
  });

  describe("State Consistency", function () {
    it("should maintain correct state after multiple operations", async function () {
      const initialAmount = ethers.parseEther("100");
      const additionalAmount = ethers.parseEther("50");
      const totalAmount = initialAmount + additionalAmount;
      
      // Initial setup
      await crvusd.mint(user1.address, totalAmount);
      await crvusd.connect(user1).approve(lendingPool.target, totalAmount);
      
      // Initial deposit
      await lendingPool.connect(user1).deposit(initialAmount);
      await rToken.connect(user1).approve(stabilityPool.target, initialAmount);
      await stabilityPool.connect(user1).deposit(initialAmount);
      
      // Partial withdrawal
      await stabilityPool.connect(user1).withdraw(ethers.parseEther("30"));
      
      // Additional deposit
      await lendingPool.connect(user1).deposit(additionalAmount);
      await rToken.connect(user1).approve(stabilityPool.target, additionalAmount);
      await stabilityPool.connect(user1).deposit(additionalAmount);
      
      // Verify final state
      const finalDeposit = await stabilityPool.getUserDeposit(user1.address);
      expect(finalDeposit).to.equal(ethers.parseEther("120"));
    });

    it("should handle concurrent deposits and withdrawals correctly", async function () {
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("50");
      
      // Setup initial deposits for both users
      await crvusd.mint(user1.address, amount1);
      await crvusd.mint(user2.address, amount2);
      
      await crvusd.connect(user1).approve(lendingPool.target, amount1);
      await crvusd.connect(user2).approve(lendingPool.target, amount2);
      
      await lendingPool.connect(user1).deposit(amount1);
      await lendingPool.connect(user2).deposit(amount2);
      
      await rToken.connect(user1).approve(stabilityPool.target, amount1);
      await rToken.connect(user2).approve(stabilityPool.target, amount2);

      // Perform concurrent operations
      await Promise.all([
        stabilityPool.connect(user1).deposit(amount1),
        stabilityPool.connect(user2).deposit(amount2)
      ]);
      
      await Promise.all([
        stabilityPool.connect(user1).withdraw(ethers.parseEther("30")),
        stabilityPool.connect(user2).withdraw(ethers.parseEther("20"))
      ]);
      
      const totalDeposits = await stabilityPool.getTotalDeposits();
      expect(totalDeposits).to.equal(ethers.parseEther("100"));
    });

    it("should maintain correct state during reward distribution", async function () {
      const depositAmount = ethers.parseEther("100");
      
      // Initial setup
      await crvusd.mint(user1.address, depositAmount);
      await crvusd.connect(user1).approve(lendingPool.target, depositAmount);
      await lendingPool.connect(user1).deposit(depositAmount);
      await rToken.connect(user1).approve(stabilityPool.target, depositAmount);
      await stabilityPool.connect(user1).deposit(depositAmount);
      
      // Accumulate rewards
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");
      await raacMinter.tick();
      
      // Partial withdrawal with rewards
      await stabilityPool.connect(user1).withdraw(ethers.parseEther("50"));
      
      // Check remaining deposit
      const remainingDeposit = await stabilityPool.getUserDeposit(user1.address);
      expect(remainingDeposit).to.equal(ethers.parseEther("50"));
      
      // Check RAAC rewards were distributed
      const raacBalance = await raacToken.balanceOf(user1.address);
      expect(raacBalance).to.be.gt(0);
    });
  });
});