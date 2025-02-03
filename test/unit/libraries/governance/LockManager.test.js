import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
const { ethers } = hre;

describe("LockManager", () => {
    let lockManager;
    let mockUser;
    const WEEK = 7 * 24 * 60 * 60;
    const YEAR = 365 * 24 * 60 * 60;

    beforeEach(async () => {
        const [signer] = await ethers.getSigners();
        mockUser = signer;
        
        // Deploy mock contract that exposes LockManager functions
        const LockManagerMock = await ethers.getContractFactory("LockManagerMock");
        lockManager = await LockManagerMock.deploy();
        
        // Set min and max lock durations
        await lockManager.setLockDurations(WEEK, 4 * YEAR);
    });

    describe("Basic Lock Operations", () => {
        it("should create a lock successfully", async () => {
            const amount = ethers.parseEther("100");
            const duration = WEEK;
            
            const tx = await lockManager.createLock(mockUser.address, amount, duration);
            await tx.wait();
            
            const lock = await lockManager.getLock(mockUser.address);
            expect(lock.amount).to.equal(amount);
            expect(lock.exists).to.be.true;
            expect(lock.end).to.be.gt(await time.latest());
        });

        it("should increase lock amount", async () => {
            const initialAmount = ethers.parseEther("100");
            const additionalAmount = ethers.parseEther("50");
            
            await lockManager.createLock(mockUser.address, initialAmount, WEEK);
            await lockManager.increaseLock(mockUser.address, additionalAmount);
            
            const lock = await lockManager.getLock(mockUser.address);
            expect(lock.amount).to.equal(initialAmount + additionalAmount);
        });

        it("should extend lock duration", async () => {
            const amount = ethers.parseEther("100");
            await lockManager.createLock(mockUser.address, amount, WEEK);
            
            const newDuration = 2 * WEEK;
            await lockManager.extendLock(mockUser.address, newDuration);
            
            const lock = await lockManager.getLock(mockUser.address);
            expect(lock.end).to.be.gt((await time.latest()) + WEEK);
        });
    });

    describe("Validation and Edge Cases", () => {
        it("should revert on zero amount lock", async () => {
            await expect(
                lockManager.createLock(mockUser.address, 0, WEEK)
            ).to.be.revertedWithCustomError(lockManager, "InvalidLockAmount");
        });

        it("should revert on invalid duration", async () => {
            const amount = ethers.parseEther("100");
            await expect(
                lockManager.createLock(mockUser.address, amount, 0)
            ).to.be.revertedWithCustomError(lockManager, "InvalidLockDuration");
        });

        it("should revert when increasing non-existent lock", async () => {
            await expect(
                lockManager.increaseLock(mockUser.address, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(lockManager, "LockNotFound");
        });

        it("should revert when extending expired lock", async () => {
            const amount = ethers.parseEther("100");
            await lockManager.createLock(mockUser.address, amount, WEEK);
            
            // Move time forward past lock expiration
            await time.increase(WEEK + 1);
            
            await expect(
                lockManager.extendLock(mockUser.address, 2 * WEEK)
            ).to.be.revertedWithCustomError(lockManager, "LockExpired");
        });
    });

    describe("Lock State Management", () => {
        it("should track total locked amount correctly", async () => {
            const amount1 = ethers.parseEther("100");
            const amount2 = ethers.parseEther("50");
            
            await lockManager.createLock(mockUser.address, amount1, WEEK);
            const totalLocked1 = await lockManager.getTotalLocked();
            expect(totalLocked1).to.equal(amount1);
            
            await lockManager.increaseLock(mockUser.address, amount2);
            const totalLocked2 = await lockManager.getTotalLocked();
            expect(totalLocked2).to.equal(amount1 + amount2);
        });

        it("should handle multiple user locks", async () => {
            const [, user2] = await ethers.getSigners();
            const amount1 = ethers.parseEther("100");
            const amount2 = ethers.parseEther("200");
            
            await lockManager.createLock(mockUser.address, amount1, WEEK);
            await lockManager.createLock(user2.address, amount2, WEEK);
            
            const lock1 = await lockManager.getLock(mockUser.address);
            const lock2 = await lockManager.getLock(user2.address);
            
            expect(lock1.amount).to.equal(amount1);
            expect(lock2.amount).to.equal(amount2);
        });
    });

    describe("Gas Optimization", () => {
        it("should be gas efficient for lock creation", async () => {
            const amount = ethers.parseEther("100");
            const tx = await lockManager.createLock.estimateGas(
                mockUser.address,
                amount,
                WEEK
            );
            expect(tx).to.be.below(150000);
        });

        it("should be gas efficient for lock updates", async () => {
            await lockManager.createLock(mockUser.address, ethers.parseEther("100"), WEEK);
            
            const gasEstimate = await lockManager.increaseLock.estimateGas(
                mockUser.address,
                ethers.parseEther("50")
            );
            expect(gasEstimate).to.be.below(100000);
        });
    });
});
