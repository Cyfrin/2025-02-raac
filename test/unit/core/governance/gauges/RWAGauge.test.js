import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("RWAGauge", () => {
    let rwaGauge;
    let gaugeController;
    let veRAACToken;
    let rewardToken;
    let owner;
    let user1;
    let user2;
    let emergencyAdmin;
    
    const MONTH = 30 * 24 * 3600;
    const WEIGHT_PRECISION = 10000;
    const DAY = 24 * 3600;

    let snapshotId;

    beforeEach(async () => {
        snapshotId = await network.provider.send('evm_snapshot');

        [owner, user1, user2, emergencyAdmin] = await ethers.getSigners();

        // Deploy mock tokens first
        const MockToken = await ethers.getContractFactory("MockToken");
        rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
        veRAACToken = await MockToken.deploy("veRAAC Token", "veRAAC", 18);
        
        // Mint tokens to users for staking and voting
        await veRAACToken.mint(owner.address, ethers.parseEther("10000"));
        await veRAACToken.mint(user1.address, ethers.parseEther("10000"));
        await veRAACToken.mint(user2.address, ethers.parseEther("5000"));
        
        // Deploy controller
        const GaugeController = await ethers.getContractFactory("GaugeController");
        gaugeController = await GaugeController.deploy(await veRAACToken.getAddress());

        // Get current time and ensure we're moving to a future period
        const currentTime = BigInt(await time.latest());
        const nextMonthStart = ((currentTime / BigInt(MONTH)) * BigInt(MONTH)) + BigInt(MONTH);
        
        // Move to next month start
        await time.setNextBlockTimestamp(nextMonthStart);
        await network.provider.send("evm_mine");

        // Deploy RWAGauge
        const RWAGauge = await ethers.getContractFactory("RWAGauge");
        rwaGauge = await RWAGauge.deploy(
            await rewardToken.getAddress(),
            await veRAACToken.getAddress(),
            await gaugeController.getAddress()
        );

        // Mint 1M tokens to owner
        await rewardToken.mint(owner.address, ethers.parseEther("1000000"));

        // Transfer rewards to gauge
        await rewardToken.connect(owner).transfer(rwaGauge.getAddress(), ethers.parseEther("100000"));

        // Setup roles and initial state
        await rwaGauge.grantRole(await rwaGauge.CONTROLLER_ROLE(), owner.address);
        await rwaGauge.grantRole(await rwaGauge.FEE_ADMIN(), owner.address);
        await rwaGauge.grantRole(await rwaGauge.EMERGENCY_ADMIN(), owner.address);
        await gaugeController.grantRole(await gaugeController.GAUGE_ADMIN(), owner.address);

        // Add gauge to controller
        await gaugeController.addGauge(await rwaGauge.getAddress(), 0, WEIGHT_PRECISION);

        // Initialize gauge weight first
        await rwaGauge.setInitialWeight(5000); // Set initial weight to 50%

        // Initialize boost parameters
        await rwaGauge.setBoostParameters(
            25000, // maxBoost (2.5x = 25000 basis points)
            10000, // minBoost (1x = 10000 basis points)
            7 * 24 * 3600 // boostWindow (7 days)
        );
        
        // Set distribution cap
        await rwaGauge.setDistributionCap(ethers.parseEther("1000000"));

        // Set monthly emission
        await rwaGauge.setMonthlyEmission(ethers.parseEther("100000"));
    });

    afterEach(async () => {
        await network.provider.send('evm_revert', [snapshotId]);
    });

    describe("Yield Direction Voting", () => {
        beforeEach(async () => {
            // Setup initial voting power
            await veRAACToken.mint(user1.address, ethers.parseEther("1000"));
            await veRAACToken.mint(user2.address, ethers.parseEther("500"));
            
            // Set initial weights through controller
            await gaugeController.connect(user1).vote(await rwaGauge.getAddress(), 2500); // 25% instead of 50%
        });

        it("should allow voting on yield direction", async () => {
            await rwaGauge.connect(user1).voteYieldDirection(5000);
            const vote = await rwaGauge.userVotes(user1.address);
            expect(vote.direction).to.equal(5000);
        });

        it("should reject invalid vote weights", async () => {
            await expect(
                rwaGauge.connect(user1).voteYieldDirection(WEIGHT_PRECISION + 1)
            ).to.be.revertedWithCustomError(rwaGauge, "InvalidWeight");
        });

        it("should require voting power", async () => {
            const user3 = (await ethers.getSigners())[3];
            await expect(
                rwaGauge.connect(user3).voteYieldDirection(5000)
            ).to.be.revertedWithCustomError(rwaGauge, "NoVotingPower");
        });
    });

    describe("Period Management", () => {
        beforeEach(async () => {
            // Get current time and align to next month boundary
            const currentTime = BigInt(await time.latest());
            const nextMonthStart = ((currentTime / BigInt(MONTH)) + 2n) * BigInt(MONTH);
            
            // Move to next month start
            await time.setNextBlockTimestamp(nextMonthStart);
            await network.provider.send("evm_mine");

            // Setup initial state
            await rwaGauge.connect(user1).voteYieldDirection(5000);
            
            // Set initial weight and emission after time alignment
            await rwaGauge.setInitialWeight(5000);
            await rwaGauge.setMonthlyEmission(ethers.parseEther("10000"));
            
            // Mine another block to ensure time progression
            await network.provider.send("evm_mine");
        });

        it("should handle monthly period transitions", async () => {
            const firstPeriodStart = BigInt(await rwaGauge.getCurrentPeriodStart());
            const periodEnd = firstPeriodStart + BigInt(MONTH);
            
            // Move well past period end
            const updateTime = periodEnd + BigInt(MONTH/2); // Add half month buffer
            await time.setNextBlockTimestamp(updateTime);
            await network.provider.send("evm_mine");
            
            await rwaGauge.updatePeriod();
            
            const newPeriodStart = BigInt(await rwaGauge.getCurrentPeriodStart());
            expect(newPeriodStart).to.be.gt(updateTime);
        });

        it("should enforce period boundaries", async () => {
            const firstPeriodStart = BigInt(await rwaGauge.getCurrentPeriodStart());
            const periodEnd = firstPeriodStart + BigInt(MONTH);
            
            // Try updating before period end (from current time)
            await expect(
                rwaGauge.updatePeriod()
            ).to.be.revertedWithCustomError(rwaGauge, "PeriodNotElapsed");

            // Move to just before period end
            const beforeEnd = periodEnd - BigInt(DAY);
            await time.setNextBlockTimestamp(beforeEnd);
            await network.provider.send("evm_mine");
            
            await expect(
                rwaGauge.updatePeriod()
            ).to.be.revertedWithCustomError(rwaGauge, "PeriodNotElapsed");

            // Move to well after period end
            const afterEnd = periodEnd + BigInt(DAY);
            await time.setNextBlockTimestamp(afterEnd);
            await network.provider.send("evm_mine");

            // Now should succeed
            await rwaGauge.updatePeriod();
        });

        it("should calculate correct emissions", async () => {
            const rewardAmount = ethers.parseEther("1000");
            await rwaGauge.notifyRewardAmount(rewardAmount);
            
            const rewardRate = await rwaGauge.rewardRate();
            expect(rewardRate).to.be.gt(0);
            
            const monthlyState = await rwaGauge.periodState();
            expect(monthlyState.distributed).to.equal(rewardAmount);
        });
    });

    describe("Reward Distribution", () => {
        beforeEach(async () => {
            // Setup initial state with proper weights
            await veRAACToken.mint(user1.address, ethers.parseEther("1000"));
            await gaugeController.connect(user1).vote(await rwaGauge.getAddress(), 2500); // 25% instead of 50%
            
            // Mint and approve tokens for staking
            await rewardToken.mint(user1.address, ethers.parseEther("1000"));
            await veRAACToken.connect(user1).approve(rwaGauge.getAddress(), ethers.MaxUint256);
            
            // Stake tokens first
            await rwaGauge.connect(user1).stake(ethers.parseEther("100"));
            
            // Setup rewards
            await rwaGauge.setMonthlyEmission(ethers.parseEther("10000"));
            await rwaGauge.notifyRewardAmount(ethers.parseEther("1000"));
            
            // Wait for rewards to accrue
            await time.increase(MONTH / 2); // Wait half a month
            
            // Vote on yield direction to establish voting power
            await rwaGauge.connect(user1).voteYieldDirection(5000);
        });

        it("should distribute rewards correctly", async () => {
            const balanceBefore = await rewardToken.balanceOf(user1.address);
            await rwaGauge.connect(user1).getReward();
            const balanceAfter = await rewardToken.balanceOf(user1.address);
            expect(balanceAfter - balanceBefore).to.be.gt(0);
        });

        it("should respect reward caps", async () => {
            // Try to notify an amount exceeding the monthly cap
            const exceedingAmount = ethers.parseEther("2500001"); // MAX_MONTHLY_EMISSION + 1
            await expect(
                rwaGauge.notifyRewardAmount(exceedingAmount)
            ).to.be.revertedWithCustomError(rwaGauge, "RewardCapExceeded");
        });

        it("should handle multiple stakers", async () => {
            // Setup second staker
            await rewardToken.mint(user2.address, ethers.parseEther("1000"));
            await veRAACToken.connect(user2).approve(rwaGauge.getAddress(), ethers.MaxUint256);
            await rwaGauge.connect(user2).stake(ethers.parseEther("100"));
            
            // Wait for more rewards to accrue
            await time.increase(MONTH / 4);
            
            // Get rewards for both users
            const balance1Before = await rewardToken.balanceOf(user1.address);
            const balance2Before = await rewardToken.balanceOf(user2.address);
            
            await rwaGauge.connect(user1).getReward();
            await rwaGauge.connect(user2).getReward();
            
            const balance1After = await rewardToken.balanceOf(user1.address);
            const balance2After = await rewardToken.balanceOf(user2.address);
            
            expect(balance1After - balance1Before).to.be.gt(0);
            expect(balance2After - balance2Before).to.be.gt(0);
        });
    });

    describe("Emergency Controls", () => {
        it("should handle emergency shutdown", async () => {
            await rwaGauge.grantRole(await rwaGauge.EMERGENCY_ADMIN(), emergencyAdmin.address);
            await rwaGauge.connect(emergencyAdmin).setEmergencyPaused(true);

            await expect(
                rwaGauge.getReward()
            ).to.be.revertedWithCustomError(rwaGauge, "EnforcedPause");
        });
    });

    describe("Staking Functionality", () => {
        it("should handle stake correctly", async () => {
            await veRAACToken.connect(user1).approve(rwaGauge.getAddress(), ethers.MaxUint256);
            await rwaGauge.connect(user1).stake(ethers.parseEther("100"));
            const balance = await rwaGauge.balanceOf(user1.address);
            expect(balance).to.equal(ethers.parseEther("100"));
        });

        it("should handle withdraw correctly", async () => {
            await veRAACToken.connect(user1).approve(rwaGauge.getAddress(), ethers.MaxUint256);
            await rwaGauge.connect(user1).stake(ethers.parseEther("100"));
            await rwaGauge.connect(user1).withdraw(ethers.parseEther("50"));
            
            const balance = await rwaGauge.balanceOf(user1.address);
            expect(balance).to.equal(ethers.parseEther("50"));
        });

        it("should prevent withdrawing more than staked", async () => {
            await veRAACToken.connect(user1).approve(rwaGauge.getAddress(), ethers.MaxUint256);
            await rwaGauge.connect(user1).stake(ethers.parseEther("100"));
            await expect(
                rwaGauge.connect(user1).withdraw(ethers.parseEther("101"))
            ).to.be.revertedWithCustomError(rwaGauge, "InsufficientBalance");
        });
    });
});
