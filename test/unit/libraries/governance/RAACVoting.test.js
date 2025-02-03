import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("RAACVoting Library", () => {
    let raacVoting;
    const WEEK = 7 * 24 * 60 * 60;
    const YEAR = 365 * 24 * 60 * 60;
    const MAX_LOCK = 4 * YEAR;
    const MULTIPLIER = 10n ** 18n;

    beforeEach(async () => {
        const RAACVotingLibrary = await ethers.getContractFactory("RAACVoting");
        const raacVotingLib = await RAACVotingLibrary.deploy();

        const RAACVotingFactory = await ethers.getContractFactory("RAACVotingMock", {
            libraries: {
                RAACVoting: await raacVotingLib.getAddress()
            }
        });

        raacVoting = await RAACVotingFactory.deploy();
        await raacVoting.waitForDeployment();
    });

    describe("calculateBias", () => {
        it("should calculate correct bias for maximum lock", async () => {
            const amount = 100n * MULTIPLIER;
            const currentTime = BigInt(await time.latest());
            const unlockTime = currentTime + BigInt(MAX_LOCK);
            const bias = await raacVoting.calculateBias(amount, unlockTime, currentTime);
            expect(bias).to.be.gt(0);
        });

        it("should revert for zero amount", async () => {
            const currentTime = BigInt(await time.latest());
            await expect(
                raacVoting.calculateBias(0n, currentTime + BigInt(WEEK), currentTime)
            ).to.be.revertedWithCustomError(raacVoting, "ZeroAmount");
        });

        it("should revert for past unlock time", async () => {
            const amount = 100n * MULTIPLIER;
            const currentTime = BigInt(await time.latest());
            await expect(
                raacVoting.calculateBias(amount, currentTime - 1n, currentTime)
            ).to.be.revertedWithCustomError(raacVoting, "InvalidUnlockTime");
        });
    });

    describe("calculateSlope", () => {
        it("should calculate correct slope", async () => {
            const amount = 100n * MULTIPLIER;
            const slope = await raacVoting.calculateSlope(amount);
            expect(slope).to.be.gt(0);
        });

        it("should revert for zero amount", async () => {
            await expect(
                raacVoting.calculateSlope(0n)
            ).to.be.revertedWithCustomError(raacVoting, "ZeroAmount");
        });

        it("should maintain proportional relationship", async () => {
            const amount1 = 100n * MULTIPLIER;
            const amount2 = 200n * MULTIPLIER;
            const slope1 = await raacVoting.calculateSlope(amount1);
            const slope2 = await raacVoting.calculateSlope(amount2);
            expect(slope2).to.be.closeTo(slope1 * 2n, 1n);
        });
    });

    describe("Gas optimization", () => {
        it("should be gas efficient for typical operations", async () => {
            const amount = 100n * MULTIPLIER;
            const currentTime = BigInt(await time.latest());
            const unlockTime = currentTime + BigInt(YEAR);
            const bias = await raacVoting.calculateBias(amount, unlockTime, currentTime);
            const tx = await raacVoting.calculateBias.send(amount, unlockTime, currentTime);
            const receipt = await tx.wait();
            expect(receipt.gasUsed).to.be.lt(150000n);
        });
    });

    describe("Fuzz testing", () => {
        it("should handle various lock durations", async () => {
            const amount = 100n * MULTIPLIER;
            const currentTime = BigInt(await time.latest());
            for (let i = 1; i <= 4; i++) {
                const duration = BigInt(i * YEAR);
                const bias = await raacVoting.calculateBias(
                    amount,
                    currentTime + duration,
                    currentTime
                );
                expect(bias).to.be.gt(0);
            }
        });
    });
});