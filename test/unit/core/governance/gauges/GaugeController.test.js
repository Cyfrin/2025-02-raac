import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("GaugeController", () => {
    let gaugeController;
    let rwaGauge;
    let raacGauge;
    let veRAACToken;
    let rewardToken;
    let owner;
    let gaugeAdmin;
    let emergencyAdmin;
    let feeAdmin;
    let user1;
    let user2;

    const MONTH = 30 * 24 * 3600;
    const WEEK = 7 * 24 * 3600;
    const WEIGHT_PRECISION = 10000;

    beforeEach(async () => {
        [owner, gaugeAdmin, emergencyAdmin, feeAdmin, user1, user2] = await ethers.getSigners();

        // Deploy Mock tokens
        const MockToken = await ethers.getContractFactory("MockToken");
        veRAACToken = await MockToken.deploy("veRAAC Token", "veRAAC", 18);
        await veRAACToken.waitForDeployment();
        const veRAACAddress = await veRAACToken.getAddress();

        rewardToken = await MockToken.deploy("Reward Token", "REWARD", 18);
        await rewardToken.waitForDeployment();
        const rewardTokenAddress = await rewardToken.getAddress();

        // Deploy GaugeController with correct parameters
        const GaugeController = await ethers.getContractFactory("GaugeController");
        gaugeController = await GaugeController.deploy(veRAACAddress);
        await gaugeController.waitForDeployment();
        const gaugeControllerAddress = await gaugeController.getAddress();

        // Deploy RWAGauge with correct parameters
        const RWAGauge = await ethers.getContractFactory("RWAGauge");
        rwaGauge = await RWAGauge.deploy(
            rewardTokenAddress,
            gaugeControllerAddress
        );
        await rwaGauge.waitForDeployment();

        // Deploy RAACGauge with correct parameters
        const RAACGauge = await ethers.getContractFactory("RAACGauge");
        raacGauge = await RAACGauge.deploy(
            rewardTokenAddress,
            gaugeControllerAddress,
            veRAACAddress
        );
        await raacGauge.waitForDeployment();

        // Setup roles
        const GAUGE_ADMIN_ROLE = await gaugeController.GAUGE_ADMIN();
        const EMERGENCY_ADMIN_ROLE = await gaugeController.EMERGENCY_ADMIN();
        const FEE_ADMIN_ROLE = await gaugeController.FEE_ADMIN();

        await gaugeController.grantRole(GAUGE_ADMIN_ROLE, gaugeAdmin.address);
        await gaugeController.grantRole(EMERGENCY_ADMIN_ROLE, emergencyAdmin.address);
        await gaugeController.grantRole(FEE_ADMIN_ROLE, feeAdmin.address);

        // Add gauges
        await gaugeController.connect(gaugeAdmin).addGauge(
            await rwaGauge.getAddress(),
            0, // RWA type
            0  // Initial weight
        );
        await gaugeController.connect(gaugeAdmin).addGauge(
            await raacGauge.getAddress(),
            1, // RAAC type
            0  // Initial weight
        );

        // Initialize gauges
        await rwaGauge.grantRole(await rwaGauge.CONTROLLER_ROLE(), owner.address);
        await raacGauge.grantRole(await raacGauge.CONTROLLER_ROLE(), owner.address);
    });

    describe("Weight Management", () => {
        beforeEach(async () => {
            await veRAACToken.mint(user1.address, ethers.parseEther("1000"));
            await veRAACToken.mint(user2.address, ethers.parseEther("500"));
        });

        it("should calculate correct initial weights", async () => {
            const weight = await gaugeController.getGaugeWeight(await rwaGauge.getAddress());
            expect(weight).to.equal(0);
        });

        it("should apply boost correctly", async () => {
            await gaugeController.connect(user1).vote(await rwaGauge.getAddress(), 5000);
            const weight = await gaugeController.getGaugeWeight(await rwaGauge.getAddress());
            expect(weight).to.be.gt(0);
        });

        it("should respect maximum weight limits", async () => {
            await expect(
                gaugeController.connect(user1).vote(await rwaGauge.getAddress(), WEIGHT_PRECISION + 1)
            ).to.be.revertedWithCustomError(gaugeController, "InvalidWeight");
        });
    });

    describe("Period Management", () => {
        beforeEach(async () => {
            await veRAACToken.mint(user1.address, ethers.parseEther("1000"));
            
            // Align to period boundary
            const currentTime = BigInt(await time.latest());
            const nextPeriodStart = ((currentTime / BigInt(MONTH)) + 1n) * BigInt(MONTH);
            await time.setNextBlockTimestamp(Number(nextPeriodStart));
            await network.provider.send("evm_mine");
        });

        it("should handle RWA monthly periods", async () => {
            // Set initial gauge weight through voting
            await gaugeController.connect(user1).vote(await rwaGauge.getAddress(), 5000);
            
            // Get initial period
            const initialPeriod = await gaugeController.gaugePeriods(await rwaGauge.getAddress());
            
            // Move time forward by a month plus buffer
            await time.increase(MONTH + 1);
            await network.provider.send("evm_mine");
            
            // Update period
            await gaugeController.updatePeriod(await rwaGauge.getAddress());
            
            // Get updated period
            const period = await gaugeController.gaugePeriods(await rwaGauge.getAddress());
            expect(period.totalDuration).to.equal(MONTH);
            expect(period.startTime).to.be.gt(initialPeriod.startTime);
        });

        it("should handle RAAC weekly periods", async () => {
            await gaugeController.connect(user1).vote(await raacGauge.getAddress(), 5000);
            
            // Get initial period
            const initialPeriod = await gaugeController.gaugePeriods(await raacGauge.getAddress());
            
            // Move time forward by a week plus buffer
            await time.increase(WEEK + 1);
            await network.provider.send("evm_mine");
            
            await gaugeController.updatePeriod(await raacGauge.getAddress());
            
            // Get updated period
            const period = await gaugeController.gaugePeriods(await raacGauge.getAddress());
            expect(period.totalDuration).to.equal(WEEK);
            expect(period.startTime).to.be.gt(initialPeriod.startTime);
        });

        it("should enforce period boundaries", async () => {
            await gaugeController.connect(user1).vote(await rwaGauge.getAddress(), 5000);
            
            // Move time forward past first period
            await time.increase(MONTH + 1);
            await network.provider.send("evm_mine");
            
            // First update should succeed
            await gaugeController.updatePeriod(await rwaGauge.getAddress());
            
            // Immediate update should fail
            await expect(
                gaugeController.updatePeriod(await rwaGauge.getAddress())
            ).to.be.revertedWithCustomError(gaugeController, "PeriodNotElapsed");
            
            // Move past period
            await time.increase(MONTH + 1);
            await network.provider.send("evm_mine");
            
            // Should succeed now
            await gaugeController.updatePeriod(await rwaGauge.getAddress());
        });
    });

    describe("Emergency Controls", () => {
        it("should pause emissions", async () => {
            await gaugeController.connect(emergencyAdmin).setEmergencyPause(true);
            expect(await gaugeController.paused()).to.be.true;
        });

        it("should resume emissions", async () => {
            await gaugeController.connect(emergencyAdmin).setEmergencyPause(true);
            await gaugeController.connect(emergencyAdmin).setEmergencyPause(false);
            expect(await gaugeController.paused()).to.be.false;
        });

        it("should respect admin roles", async () => {
            await expect(
                gaugeController.connect(user1).setEmergencyPause(true)
            ).to.be.revertedWithCustomError(gaugeController, "UnauthorizedCaller");
        });
    });

    describe("Integration Tests", () => {
        it("should integrate with veRAAC voting power", async () => {
            await veRAACToken.mint(user1.address, ethers.parseEther("1000"));
            await gaugeController.connect(user1).vote(await rwaGauge.getAddress(), 5000);
            
            const userVote = await gaugeController.userGaugeVotes(user1.address, await rwaGauge.getAddress());
            expect(userVote).to.equal(5000);
        });

        it("should handle boost calculations", async () => {
            // Setup boost parameters first
            const BOOST_PARAMS = {
                maxBoost: 25000n,    // 2.5x max boost
                minBoost: 10000n,    // 1x min boost
                boostWindow: BigInt(7 * 24 * 3600), // 1 week
                baseWeight: ethers.parseEther("1"),
                totalVotingPower: 0n,
                totalWeight: 0n
            };
            
            // Setup initial conditions with safer numbers
            const amount = ethers.parseEther("100");
            const userBalance = ethers.parseEther("1000");
            const totalSupply = ethers.parseEther("10000");
            
            // Setup veToken balances and total supply with exact amounts
            await veRAACToken.mint(user1.address, userBalance);
            await veRAACToken.mint(owner.address, totalSupply - (userBalance));
            
            // Set gauge weight (gauge is already added in beforeEach)
            await gaugeController.connect(user1).vote(await rwaGauge.getAddress(), 5000); // 50% weight
            
            // Align to period boundary and ensure enough time has passed
            const currentTime = BigInt(await time.latest());
            const nextPeriodStart = ((currentTime / BigInt(MONTH)) + 2n) * BigInt(MONTH);
            await time.setNextBlockTimestamp(Number(nextPeriodStart));
            await network.provider.send("evm_mine");
            
            // Move time forward to allow period update
            await time.increase(MONTH + 1);
            await network.provider.send("evm_mine");
            
            await gaugeController.updatePeriod(await rwaGauge.getAddress());
            
            // Calculate boost using library
            const [boostBasisPoints, boostedAmount] = await gaugeController.calculateBoost(
                user1.address,
                await rwaGauge.getAddress(),
                amount
            );

            // console.log('Amount', ethers.formatEther(amount)); //100000000000000000000 -> 100
            // console.log('Boosted Amount', ethers.formatEther(boostedAmount)); //11500000000000000000 -> 11.5
            // console.log('Boost Basis Points', boostBasisPoints.toString()); //1500 -> 1500

            // Verify boost calculations with proper BigNumber comparisons
            expect(boostBasisPoints).to.be.gte(BOOST_PARAMS.minBoost); // At least 1x
            expect(boostBasisPoints).to.be.lte(BOOST_PARAMS.maxBoost); // Max 2.5x
            expect(boostedAmount).to.be.gte(amount); 
            expect(boostedAmount).to.be.lte(BigInt(amount) * 125n / 100n);
        });
    });
});
