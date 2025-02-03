import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("RAACGauge", () => {
    let raacGauge;
    let gaugeController;
    let veRAACToken;
    let rewardToken;
    let owner;
    let user1;
    let user2;
    let emergencyAdmin;
    let snapshotId;
    
    const WEEK = 7 * 24 * 3600;
    const WEIGHT_PRECISION = 10000;

    beforeEach(async () => {
        snapshotId = await network.provider.send('evm_snapshot');
        [owner, user1, user2, emergencyAdmin] = await ethers.getSigners();

        // Deploy mock tokens first
        const MockToken = await ethers.getContractFactory("MockToken");
        rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
        veRAACToken = await MockToken.deploy("veRAAC Token", "veRAAC", 18);
        
        // Mint tokens to users for staking and voting
        await rewardToken.mint(user1.address, ethers.parseEther("1000"));
        await rewardToken.mint(user2.address, ethers.parseEther("1000"));
        await veRAACToken.mint(user1.address, ethers.parseEther("1000"));
        await veRAACToken.mint(user2.address, ethers.parseEther("500"));
        
        // Deploy controller
        const GaugeController = await ethers.getContractFactory("GaugeController");
        gaugeController = await GaugeController.deploy(await veRAACToken.getAddress());

        // Get current time and align to next week boundary with proper buffer
        const currentTime = BigInt(await time.latest());
        const nextWeekStart = ((currentTime / BigInt(WEEK)) + 3n) * BigInt(WEEK); // Add 3 weeks buffer
        
        // Move to next week start
        await time.setNextBlockTimestamp(Number(nextWeekStart));
        await network.provider.send("evm_mine");

        // Deploy RAACGauge
        const RAACGauge = await ethers.getContractFactory("RAACGauge");
        raacGauge = await RAACGauge.deploy(
            await rewardToken.getAddress(),
            await veRAACToken.getAddress(),
            await gaugeController.getAddress()
        );

        // Setup roles and initial state
        await raacGauge.grantRole(await raacGauge.CONTROLLER_ROLE(), owner.address);
        
        // Approve tokens for staking
        await rewardToken.connect(user1).approve(raacGauge.getAddress(), ethers.MaxUint256);
        await rewardToken.connect(user2).approve(raacGauge.getAddress(), ethers.MaxUint256);
        
        // Add gauge to controller and set initial weights
        await gaugeController.grantRole(await gaugeController.GAUGE_ADMIN(), owner.address);
        await gaugeController.addGauge(await raacGauge.getAddress(), 0, WEIGHT_PRECISION);
        
        // Move time forward to ensure period is ready
        await time.increase(WEEK);
        
        // Set initial gauge weight through voting
        await gaugeController.connect(user1).vote(await raacGauge.getAddress(), WEIGHT_PRECISION);
        
        // Set initial weekly emission rate
        await raacGauge.setWeeklyEmission(ethers.parseEther("10000"));
        
        // Transfer reward tokens to gauge for distribution
        await rewardToken.mint(raacGauge.getAddress(), ethers.parseEther("100000"));

        // Initialize boost parameters before any staking operations
        await raacGauge.setBoostParameters(
            25000, // 2.5x max boost
            10000, // 1x min boost
            WEEK  // 7 days boost window
        );

        // Set initial weight after time alignment
        await raacGauge.setInitialWeight(5000); // 50% weight
        
        // Mine another block to ensure time progression
        await network.provider.send("evm_mine");
    });

    afterEach(async () => {
        await network.provider.send('evm_revert', [snapshotId]);
    });

    describe("Initialization", () => {
        it("should initialize with correct state", async () => {
            expect(await raacGauge.rewardToken()).to.equal(await rewardToken.getAddress());
            expect(await raacGauge.stakingToken()).to.equal(await veRAACToken.getAddress());
            expect(await raacGauge.WEEK()).to.equal(WEEK);
        });

        it("should set correct initial parameters", async () => {
            const weeklyState = await raacGauge.periodState();
            
            // Check voting period parameters
            const votingPeriod = weeklyState.votingPeriod;
            expect(votingPeriod[3]).to.equal(5000n); // value - matches setInitialWeight
            expect(votingPeriod[4]).to.equal(0n);    // weightedSum
            expect(votingPeriod[5]).to.equal(604800n);    // totalDuration
            expect(votingPeriod[6]).to.equal(10000n); // weight
            
            // Check emission and distributed amounts
            expect(weeklyState.emission).to.equal(ethers.parseEther("10000")); // emission cap
            expect(weeklyState.distributed).to.equal(0n); // distributed amount
            
            // Check period start time exists
            expect(weeklyState.periodStartTime).to.be.gt(0n); // periodStartTime
        });
    });

    describe("Emission Direction Voting", () => {
        beforeEach(async () => {
            // Ensure user has voting power before staking
            await veRAACToken.mint(user1.address, ethers.parseEther("1000"));
            await veRAACToken.mint(user2.address, ethers.parseEther("500"));
            
            // Stake a reasonable amount
            await rewardToken.mint(user1.address, ethers.parseEther("100"));
            // Allowance
            await veRAACToken.connect(user1).approve(raacGauge.getAddress(), ethers.MaxUint256);
            await raacGauge.connect(user1).stake(ethers.parseEther("100"));
        });

        it("should allow voting on emission direction", async () => {
            await raacGauge.connect(user1).voteEmissionDirection(5000);
            const vote = await raacGauge.userVotes(user1.address);
            expect(vote.direction).to.equal(5000);
            expect(vote.weight).to.be.gt(0);
        });

        it("should reject invalid vote weights", async () => {
            await expect(
                raacGauge.connect(user1).voteEmissionDirection(WEIGHT_PRECISION + 1)
            ).to.be.revertedWithCustomError(raacGauge, "InvalidWeight");
        });

        it("should require voting power", async () => {
            const user3 = (await ethers.getSigners())[3];
            await expect(
                raacGauge.connect(user3).voteEmissionDirection(5000)
            ).to.be.revertedWithCustomError(raacGauge, "NoVotingPower");
        });

        it("should update total emission votes correctly", async () => {
            await raacGauge.connect(user1).voteEmissionDirection(5000);
            const totalBefore = await raacGauge.totalVotes();
            
            await raacGauge.connect(user2).voteEmissionDirection(3000);
            const totalAfter = await raacGauge.totalVotes();
            
            expect(totalAfter).to.be.gt(totalBefore);
        });
    });

    describe("Period Management", () => {
        beforeEach(async () => {
            // Setup initial state
            await raacGauge.connect(user1).voteEmissionDirection(5000);
            await raacGauge.setWeeklyEmission(ethers.parseEther("10000"));
            
            // Get current time and calculate next week start
            const currentTime = BigInt(await time.latest());
            const nextWeekStart = ((currentTime / BigInt(WEEK)) + 2n) * BigInt(WEEK); // Add 2 weeks for buffer
            
            // Move to next week start
            await time.setNextBlockTimestamp(nextWeekStart);
            await network.provider.send("evm_mine");
            
            // Set the initial weight
            await raacGauge.setInitialWeight(5000);

            // Mine another block to move forward in time
            await network.provider.send("evm_mine");
        });

        it("should handle weekly period transitions", async () => {
            // Get initial period start and calculate period end
            const weeklyState = await raacGauge.periodState();
            const firstPeriodStart = BigInt(weeklyState.periodStartTime);
            const periodEnd = firstPeriodStart + BigInt(WEEK);
            
            // Move to well after period end (add buffer)
            const updateTime = periodEnd + BigInt(WEEK/2); // Add half week buffer
            await time.setNextBlockTimestamp(updateTime);
            await network.provider.send("evm_mine");

            // Update period
            await raacGauge.updatePeriod();

            // Verify new period start time
            const newWeeklyState = await raacGauge.periodState();
            expect(BigInt(newWeeklyState.periodStartTime)).to.be.gt(updateTime);
        });

        it("should enforce period boundaries", async () => {
            // Get initial period start
            const weeklyState = await raacGauge.periodState();
            const firstPeriodStart = BigInt(weeklyState.periodStartTime);
            const periodEnd = firstPeriodStart + BigInt(WEEK);
            
            // Move to middle of period
            const midPeriod = firstPeriodStart + (BigInt(WEEK) / 2n);
            await time.setNextBlockTimestamp(midPeriod);
            await network.provider.send("evm_mine");
            
            // Attempt to updatePeriod (should revert)
            await expect(
                raacGauge.updatePeriod()
            ).to.be.revertedWithCustomError(raacGauge, "PeriodNotElapsed");

            // Move to just after period end
            await time.setNextBlockTimestamp(periodEnd + 1n);
            await network.provider.send("evm_mine");

            // Now updatePeriod should succeed
            await raacGauge.updatePeriod();
        });

        it("should track distributed rewards correctly", async () => {
            // Set a reasonable reward amount within weekly emission cap
            const rewardAmount = ethers.parseEther("1000");
            
            // Notify rewards
            await raacGauge.notifyRewardAmount(rewardAmount);
            
            // Check weekly state
            const weeklyState = await raacGauge.periodState();
            expect(weeklyState.distributed).to.equal(rewardAmount);
        });
    });

    describe("Reward Distribution", () => {
        beforeEach(async () => {
            await veRAACToken.connect(user1).approve(raacGauge.getAddress(), ethers.MaxUint256);
            await raacGauge.connect(user1).stake(ethers.parseEther("100"));
            await raacGauge.notifyRewardAmount(ethers.parseEther("1000"));
            await raacGauge.connect(user1).voteEmissionDirection(5000);
        });

        it("should distribute rewards correctly", async () => {
            await time.increase(WEEK / 2);
            await raacGauge.connect(user1).getReward();
            const balance = await rewardToken.balanceOf(user1.address);
            expect(balance).to.be.gt(0);
        });

        it("should respect weekly emission caps", async () => {
            await expect(
                raacGauge.notifyRewardAmount(ethers.parseEther("500001"))
            ).to.be.revertedWithCustomError(raacGauge, "RewardCapExceeded");
        });

        it("should handle multiple stakers", async () => {
            await veRAACToken.connect(user2).approve(raacGauge.getAddress(), ethers.MaxUint256);
            await raacGauge.connect(user2).stake(ethers.parseEther("100"));
            await time.increase(WEEK / 2);
            
            await raacGauge.connect(user1).getReward();
            await raacGauge.connect(user2).getReward();
            
            const balance1 = await rewardToken.balanceOf(user1.address);
            const balance2 = await rewardToken.balanceOf(user2.address);
            
            expect(balance1).to.be.gt(0);
            expect(balance2).to.be.gt(0);
        });
    });

    describe("Staking Functionality", () => {
        it("should handle stake correctly", async () => {
            await veRAACToken.connect(user1).approve(raacGauge.getAddress(), ethers.MaxUint256);
            await raacGauge.connect(user1).stake(ethers.parseEther("100"));
            const balance = await raacGauge.balanceOf(user1.address);
            expect(balance).to.equal(ethers.parseEther("100"));
        });

        it("should handle withdraw correctly", async () => {
            await veRAACToken.connect(user1).approve(raacGauge.getAddress(), ethers.MaxUint256);
            await raacGauge.connect(user1).stake(ethers.parseEther("100"));
            await raacGauge.connect(user1).withdraw(ethers.parseEther("50"));
            
            const balance = await raacGauge.balanceOf(user1.address);
            expect(balance).to.equal(ethers.parseEther("50"));
        });

        it("should prevent withdrawing more than staked", async () => {
            await veRAACToken.connect(user1).approve(raacGauge.getAddress(), ethers.MaxUint256);
            await raacGauge.connect(user1).stake(ethers.parseEther("100"));
            await expect(
                raacGauge.connect(user1).withdraw(ethers.parseEther("101"))
            ).to.be.revertedWithCustomError(raacGauge, "InsufficientBalance");
        });
    });
});
