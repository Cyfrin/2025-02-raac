import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("BoostController", () => {
    let boostController;
    let veToken;
    let mockPool;
    let owner;
    let user1;
    let user2;
    let manager;

    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
    
    beforeEach(async () => {
        [owner, user1, user2, manager] = await ethers.getSigners();
        
        // Deploy mock contracts
        const MockVeToken = await ethers.getContractFactory("MockVeToken");
        veToken = await MockVeToken.deploy();
        
        const MockPool = await ethers.getContractFactory("MockPool");
        mockPool = await MockPool.deploy();
        
        // Deploy BoostController
        const BoostController = await ethers.getContractFactory("BoostController");
        boostController = await BoostController.deploy(veToken.getAddress());
        
        // Setup roles
        await boostController.grantRole(MANAGER_ROLE, manager.address);
        
        // Add pool to supported pools
        await boostController.connect(manager).addSupportedPool(mockPool.getAddress());
        
        // Setup initial veToken balances
        await veToken.mint(user1.address, ethers.parseEther("1000"));
        await veToken.mint(user2.address, ethers.parseEther("2000"));
    });

    describe("Initialization", () => {
        it("should set correct initial values", async () => {
            expect(await boostController.veToken()).to.equal(await veToken.getAddress());
            expect(await boostController.hasRole(MANAGER_ROLE, manager.address)).to.be.true;
        });

        it("should revert with zero address veToken", async () => {
            const BoostController = await ethers.getContractFactory("BoostController");
            await expect(
                BoostController.deploy(ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(boostController, "InvalidPool");
        });
    });

    describe("Pool Management", () => {
        it("should add supported pool", async () => {
            const newPool = await (await ethers.getContractFactory("MockPool")).deploy();
            await expect(boostController.connect(manager).addSupportedPool(newPool.getAddress()))
                .to.emit(boostController, "PoolAdded")
                .withArgs(newPool.getAddress());
            
            expect(await boostController.supportedPools(newPool.getAddress())).to.be.true;
        });

        it("should remove supported pool", async () => {
            await expect(boostController.connect(manager).removeSupportedPool(mockPool.getAddress()))
                .to.emit(boostController, "PoolRemoved")
                .withArgs(mockPool.getAddress());
            
            expect(await boostController.supportedPools(mockPool.getAddress())).to.be.false;
        });

        it("should revert when non-manager tries to add pool", async () => {
            await expect(
                boostController.connect(user1).addSupportedPool(mockPool.getAddress())
            ).to.be.revertedWithCustomError(boostController, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Boost Calculations", () => {
        it("should calculate correct boost for user", async () => {
            const amount = ethers.parseEther("100");
            const [boostBasisPoints, boostedAmount] = await boostController.calculateBoost(
                user1.address,
                mockPool.getAddress(),
                amount
            );


            const boostAmount = boostedAmount * boostBasisPoints / 10000n;
            expect(boostAmount).to.be.gt(amount);
            expect(boostAmount).to.be.lte(amount * BigInt(25000) / BigInt(10000)); // Max 2.5x
        });

        it("should respect minimum boost", async () => {
            const amount = ethers.parseEther("100");
            // User with very small balance
            await veToken.setBalance(user1.address, ethers.parseEther("0.1"));
            
            const [boostBasisPoints, boostedAmount] = await boostController.calculateBoost(
                user1.address,
                mockPool.getAddress(),
                amount
            );

            expect(boostedAmount).to.equal(amount); // 1x boost
        });

        it("should handle boost updates correctly", async () => {
            const amount = ethers.parseEther("100");
            
            // Initial boost setup
            await boostController.connect(user1).updateUserBoost(user1.address, mockPool.getAddress());
            
            const initialBoost = await boostController.getWorkingBalance(
                user1.address,
                mockPool.getAddress()
            );

            // Increase veToken balance
            await veToken.mint(user1.address, ethers.parseEther("1000"));
            
            // Update boost and verify event
            const [boostBasisPoints, boostedAmount] = await boostController.calculateBoost(
                user1.address,
                mockPool.getAddress(),
                10000
            );

            const tx = await boostController.connect(user1).updateUserBoost(user1.address, mockPool.getAddress());
            const receipt = await tx.wait();

            // Get BoostUpdated event from logs
            const boostUpdatedEvent = receipt.logs[0];
            expect(boostUpdatedEvent.args[0]).to.equal(user1.address);
            expect(boostUpdatedEvent.args[1]).to.equal(await mockPool.getAddress());
            expect(boostUpdatedEvent.args[2]).to.equal(boostedAmount);

            // Get PoolBoostUpdated event from logs
            const poolBoostUpdatedEvent = receipt.logs[1]; 
            expect(poolBoostUpdatedEvent.args[0]).to.equal(await mockPool.getAddress());
            expect(poolBoostUpdatedEvent.args[1]).to.equal(boostedAmount);
            expect(poolBoostUpdatedEvent.args[2]).to.equal(boostedAmount);
        });
    });

    describe("Delegation System", () => {
        it("should delegate boost correctly", async () => {
            const amount = ethers.parseEther("500");
            const duration = 7 * 24 * 3600; // 7 days

            await expect(
                boostController.connect(user1).delegateBoost(user2.address, amount, duration)
            ).to.emit(boostController, "BoostDelegated")
             .withArgs(user1.address, user2.address, amount, duration);

            const delegation = await boostController.getUserBoost(user1.address, user2.address);
            expect(delegation.amount).to.equal(amount);
            expect(delegation.delegatedTo).to.equal(user2.address);
        });

        it("should prevent double delegation", async () => {
            const amount = ethers.parseEther("500");
            const duration = 7 * 24 * 3600;

            await boostController.connect(user1).delegateBoost(user2.address, amount, duration);

            await expect(
                boostController.connect(user1).delegateBoost(user2.address, amount, duration)
            ).to.be.revertedWithCustomError(boostController, "BoostAlreadyDelegated");
        });

        it("should handle delegation removal correctly", async () => {
            const amount = ethers.parseEther("500");
            const duration = 7 * 24 * 3600;

            await boostController.connect(user1).delegateBoost(user2.address, amount, duration);
            
            // Move time forward
            await time.increase(duration);

            await expect(
                boostController.connect(user2).removeBoostDelegation(user1.address)
            ).to.emit(boostController, "DelegationRemoved")
             .withArgs(user1.address, user2.address, amount);
        });
    });

    describe("Emergency Controls", () => {
        it("should handle emergency shutdown", async () => {
            await expect(boostController.connect(manager).setEmergencyShutdown(true))
                .to.emit(boostController, "EmergencyShutdown")
                .withArgs(manager.address, true);

            // Verify operations are paused
            const amount = ethers.parseEther("500");
            await expect(
                boostController.connect(user1).delegateBoost(user2.address, amount, 7 * 24 * 3600)
            ).to.be.revertedWithCustomError(boostController, "EmergencyPaused");
        });

        it("should update boost parameters correctly", async () => {
            const newMaxBoost = 20000; // 2x
            const newMinBoost = 10000; // 1x
            const newWindow = 14 * 24 * 3600; // 14 days

            await expect(
                boostController.connect(manager).setBoostParameters(newMaxBoost, newMinBoost, newWindow)
            ).to.emit(boostController, "BoostParametersUpdated")
             .withArgs(newMaxBoost, newMinBoost, newWindow);
        });
    });

    describe("Integration Scenarios", () => {
        it("should handle multiple users and pools correctly", async () => {
            const pools = await Promise.all([1, 2, 3].map(async () => {
                const pool = await (await ethers.getContractFactory("MockPool")).deploy();
                await boostController.connect(manager).addSupportedPool(pool.getAddress());
                return pool;
            }));

            // Setup different boost scenarios for each pool
            for (const pool of pools) {
                await boostController.connect(user1).updateUserBoost(user1.address, pool.getAddress());
                await boostController.connect(user2).updateUserBoost(user2.address, pool.getAddress());
            }

            // Verify boosts are calculated independently
            for (const pool of pools) {
                const user1Boost = await boostController.getWorkingBalance(user1.address, pool.getAddress());
                const user2Boost = await boostController.getWorkingBalance(user2.address, pool.getAddress());
                expect(user2Boost).to.be.gt(user1Boost); // User2 has more veToken
            }
        });
    });
});
