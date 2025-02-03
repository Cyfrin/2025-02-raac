import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";

function generateRandomAmount() {
    return ethers.parseEther(
        (Math.random() * 1000000).toFixed(18)
    );
}

describe("BoostCalculator", () => {
    let boostCalculator;
    let mockUser;

    beforeEach(async () => {
        const [signer] = await ethers.getSigners();
        mockUser = signer;
        
        const BoostCalculatorMock = await ethers.getContractFactory("BoostCalculatorMock");
        boostCalculator = await BoostCalculatorMock.deploy();

        await boostCalculator.setBoostParameters(
            25000n, // maxBoost
            10000n, // minBoost
            7n * 24n * 3600n, // boostWindow
            ethers.parseEther("1"), // baseWeight
            0n, // totalVotingPower
            0n // totalWeight
        );
    });

    describe("calculateTimeWeightedBoost", () => {
        it("should return base amount when total supply is 0", async () => {
            const amount = ethers.parseEther("100");
            const userBalance = ethers.parseEther("50");
            const totalSupply = 0n;

            const [boostBasisPoints, boostedAmount] = await boostCalculator.calculateTimeWeightedBoostView(
                userBalance,
                totalSupply,
                amount
            );

            expect(boostBasisPoints).to.equal(0n);
            expect(boostedAmount).to.equal(amount);
        });

        it("should respect minimum boost", async () => {
            const amount = ethers.parseEther("10");
            const userBalance = ethers.parseEther("0.1");
            const totalSupply = ethers.parseEther("10000");

            await boostCalculator.setTotalVotingPower(totalSupply);
            await boostCalculator.setTotalWeight(totalSupply);
            await boostCalculator.setVotingPower(userBalance);
            await boostCalculator.updateBoostPeriod();

            const [boostBasisPoints, boostedAmount] = await boostCalculator.calculateTimeWeightedBoostView(
                userBalance,
                totalSupply,
                amount
            );

            expect(boostBasisPoints).to.equal(10000n);
            expect(boostedAmount).to.equal(amount);
        });

        it("should respect maximum boost", async () => {
            const amount = ethers.parseEther("100");
            const userBalance = ethers.parseEther("10000");
            const totalSupply = ethers.parseEther("10000");

            await boostCalculator.setTotalVotingPower(totalSupply);
            await boostCalculator.setTotalWeight(totalSupply);
            await boostCalculator.setVotingPower(userBalance);
            await boostCalculator.updateBoostPeriod();

            const [boostBasisPoints, boostedAmount] = await boostCalculator.calculateTimeWeightedBoostView(
                userBalance,
                totalSupply,
                amount
            );

            const expectedMaxBoost = (amount * 25000n) / 10000n;
            expect(boostBasisPoints).to.equal(25000n);
            expect(boostedAmount).to.equal(expectedMaxBoost);
        });
    });

    describe("Time-weighted calculations", () => {
        it("should calculate correct boost after time period", async () => {
            const amount = ethers.parseEther("100");
            const userBalance = ethers.parseEther("1000");
            const totalSupply = ethers.parseEther("10000");

            await boostCalculator.setTotalVotingPower(totalSupply);
            await boostCalculator.setTotalWeight(totalSupply);
            await boostCalculator.setVotingPower(userBalance);
            await boostCalculator.updateBoostPeriod();

            const [initialBoostPoints, initialBoostedAmount] = await boostCalculator.calculateTimeWeightedBoostView(
                userBalance,
                totalSupply,
                amount
            );

            await time.increase(3600 * 24);

            const [newBoostPoints, newBoostedAmount] = await boostCalculator.calculateTimeWeightedBoostView(
                userBalance,
                totalSupply,
                amount
            );

            expect(newBoostPoints).to.equal(initialBoostPoints);
            expect(newBoostedAmount).to.equal(initialBoostedAmount);
        });

        it("should handle boost window boundaries", async () => {
            const amount = ethers.parseEther("100");
            const userBalance = ethers.parseEther("1000");
            const totalSupply = ethers.parseEther("10000");

            await boostCalculator.setTotalVotingPower(totalSupply);
            await boostCalculator.setTotalWeight(totalSupply);
            await boostCalculator.setVotingPower(userBalance);
            await boostCalculator.updateBoostPeriod();

            await time.increase(7 * 24 * 3600);

            const [boostPoints, boostedAmount] = await boostCalculator.calculateTimeWeightedBoostView(
                userBalance,
                totalSupply,
                amount
            );

            expect(boostedAmount).to.be.gt(amount);
            expect(boostedAmount).to.be.lte((amount * 25000n) / 10000n);
        });
    });

    describe("Property-based tests", () => {
        beforeEach(async () => {
            // Get current time and align to next period boundary
            const currentTime = BigInt(await time.latest());
            const nextPeriodStart = ((currentTime / BigInt(7 * 24 * 3600)) + 2n) * BigInt(7 * 24 * 3600);
            
            // Move to next period start
            await time.setNextBlockTimestamp(nextPeriodStart);
            await network.provider.send("evm_mine");
        });

        it("should maintain boost monotonicity with increasing balance", async () => {
            const amount = ethers.parseEther("100");
            const totalSupply = ethers.parseEther("10000");
            
            // Test 20 random increasing balances
            let lastBoostPoints = 0n;
            let lastBalance = ethers.parseEther("0");
            
            for(let i = 0; i < 20; i++) {
                const userBalance = lastBalance + generateRandomAmount();
                
                // Move time forward by a period each iteration
                await time.increase(7 * 24 * 3600);
                
                // Set the state
                await boostCalculator.setTotalVotingPower(totalSupply);
                await boostCalculator.setTotalWeight(totalSupply);
                await boostCalculator.setVotingPower(userBalance);
                await boostCalculator.updateBoostPeriod();

                const [boostPoints, _] = await boostCalculator.calculateTimeWeightedBoostView(
                    userBalance,
                    totalSupply,
                    amount
                );

                expect(boostPoints).to.be.gte(lastBoostPoints);
                lastBoostPoints = boostPoints;
                lastBalance = userBalance;
            }
        });

        it("should handle multiple users with different balances", async () => {
            const amount = ethers.parseEther("100");
            const totalSupply = ethers.parseEther("10000");
            
            const scenarios = [
                { balance: ethers.parseEther("100"), expectedBoostRange: [10000n, 11500n] },
                { balance: ethers.parseEther("1000"), expectedBoostRange: [11500n, 15000n] },
                { balance: ethers.parseEther("5000"), expectedBoostRange: [15000n, 20000n] }
            ];

            for (const scenario of scenarios) {
                // Move time forward by a period for each scenario
                await time.increase(7 * 24 * 3600);
                
                // Set the state
                await boostCalculator.setTotalVotingPower(totalSupply);
                await boostCalculator.setTotalWeight(totalSupply);
                await boostCalculator.setVotingPower(scenario.balance);
                await boostCalculator.updateBoostPeriod();

                const [boostPoints, boostedAmount] = await boostCalculator.calculateTimeWeightedBoostView(
                    scenario.balance,
                    totalSupply,
                    amount
                );

                expect(boostPoints).to.be.gte(scenario.expectedBoostRange[0]);
                expect(boostPoints).to.be.lte(scenario.expectedBoostRange[1]);
            }
        });
    });
});