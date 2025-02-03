import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
const { ethers } = hre;

const HOUR = 3600n;
const DAY = 24n * HOUR;
const WEEK = 7n * DAY;
const MONTH = 30n * DAY;
const YEAR = 365n * DAY;

describe("TimeWeightedAverage", () => {
    let timeWeightedAverage;
    let owner;

    async function setupPeriod(initialValue, duration = WEEK) {
        const currentTime = BigInt(await time.latest());
        const nextPeriod = ((currentTime / duration) + 2n) * duration;
        
        await time.setNextBlockTimestamp(Number(nextPeriod - 1n));
        await network.provider.send("evm_mine");
        
        await timeWeightedAverage.createPeriod(
            nextPeriod,
            duration,
            initialValue,
            ethers.parseEther("1")
        );
        
        return nextPeriod;
    }

    beforeEach(async () => {
        [owner] = await ethers.getSigners();
        
        // First deploy the library
        const TimeWeightedAverageLib = await ethers.getContractFactory("TimeWeightedAverage");
        const timeWeightedAverageLib = await TimeWeightedAverageLib.deploy();
        await timeWeightedAverageLib.waitForDeployment();
        
        // Then deploy the mock with the library linked
        const TimeWeightedAverageMock = await ethers.getContractFactory("TimeWeightedAverageMock", {
            libraries: {
                TimeWeightedAverage: await timeWeightedAverageLib.getAddress()
            }
        });
        timeWeightedAverage = await TimeWeightedAverageMock.deploy();
        await timeWeightedAverage.waitForDeployment();
    });

    describe("Basic Functionality", () => {
        it("should create a period with initial value", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 2n) * WEEK;
            
            await time.setNextBlockTimestamp(Number(nextPeriod - 1n));
            await network.provider.send("evm_mine");
            
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );
            
            const value = await timeWeightedAverage.getCurrentValue();
            expect(value).to.equal(ethers.parseEther("100"));
        });

        it("should maintain constant value without updates", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await time.setNextBlockTimestamp(Number(currentTime));
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );

            await time.setNextBlockTimestamp(Number(nextPeriod));
            const midPoint = nextPeriod + (WEEK / 2n);
            const avgValue = await timeWeightedAverage.calculateAverage(midPoint);
            expect(avgValue).to.equal(ethers.parseEther("100"));
        });

        it("should handle single value update", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await time.setNextBlockTimestamp(Number(currentTime));
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );

            const updateTime = nextPeriod + DAY;
            await time.setNextBlockTimestamp(Number(updateTime));
            await timeWeightedAverage.updateValue(
                ethers.parseEther("200"),
                updateTime
            );

            const value = await timeWeightedAverage.getCurrentValue();
            expect(value).to.equal(ethers.parseEther("200"));
        });

        it("should calculate simple average between two values", async () => {
            const nextPeriod = await setupPeriod(ethers.parseEther("100"));
            
            // Update halfway through period
            const midPoint = nextPeriod + (WEEK / 2n);
            await time.setNextBlockTimestamp(Number(midPoint));
            await timeWeightedAverage.updateValue(
                ethers.parseEther("200"),
                midPoint
            );
            
            // Check at 3/4 through period
            const checkTime = midPoint + (WEEK / 4n);
            await time.setNextBlockTimestamp(Number(checkTime));
            const average = await timeWeightedAverage.calculateAverage(checkTime);
            
            expect(average).to.be.closeTo(
                // 100 * (3/4) + 200 * (1/4) = 133.333333333333333333
                ethers.parseEther("133.333333333333333333"),
                ethers.parseEther("1")
            );
        });
    });

    describe("Period Management", () => {
        it("should handle period transitions correctly", async () => {
            const nextPeriod = await setupPeriod(ethers.parseEther("100"));
            // First transition at WEEK/4
            const firstUpdate = nextPeriod + (WEEK / 4n);
            await time.setNextBlockTimestamp(Number(firstUpdate));
            await timeWeightedAverage.updateValue(
                ethers.parseEther("200"),
                firstUpdate
            );
            const avgValueAfterFirst = await timeWeightedAverage.calculateAverage(firstUpdate);
            // Second transition at WEEK/2
            const secondUpdate = nextPeriod + (WEEK / 2n);
            await time.setNextBlockTimestamp(Number(secondUpdate));
            await timeWeightedAverage.updateValue(
                ethers.parseEther("300"),
                secondUpdate
            );
            
            const avgValueAfter = await timeWeightedAverage.calculateAverage(secondUpdate);
            expect(avgValueAfter).to.be.closeTo(
                ethers.parseEther("150"),
                ethers.parseEther("1")
            );
        });

        it("should handle micro time transitions", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / DAY) + 2n) * DAY;
            
            // Move to just before period start
            await time.setNextBlockTimestamp(Number(nextPeriod - 1n));
            await network.provider.send("evm_mine");
            
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                DAY,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );

            // Update every hour for 6 hours with increasing values
            for (let i = 1; i <= 6; i++) {
                const updateTime = nextPeriod + BigInt(BigInt(i) * HOUR);
                await time.setNextBlockTimestamp(Number(updateTime));
                await timeWeightedAverage.updateValue(
                    ethers.parseEther((100 + (i * 10)).toString()),
                    updateTime
                );
                await network.provider.send("evm_mine");
            }

            const checkTime = nextPeriod + BigInt(BigInt(6) * HOUR);
            await time.setNextBlockTimestamp(Number(checkTime));
            const average = await timeWeightedAverage.calculateAverage(checkTime);
            expect(average).to.be.closeTo(
                ethers.parseEther("125"), // Average of values over 6 hours
                ethers.parseEther("1")
            );
        });

        it("should handle multiple period transitions", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 2n) * WEEK;
            
            // Move to just before period start
            await time.setNextBlockTimestamp(Number(nextPeriod - 1n));
            await network.provider.send("evm_mine");
            
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );

            // Create array of updates with proper timing
            const updates = [
                { timeOffset: WEEK / 4n, value: "150" },
                { timeOffset: WEEK / 2n, value: "200" },
                { timeOffset: (WEEK * 3n) / 4n, value: "250" }
            ];

            for (const update of updates) {
                const updateTime = nextPeriod + update.timeOffset;
                await time.setNextBlockTimestamp(Number(updateTime));
                await timeWeightedAverage.updateValue(
                    ethers.parseEther(update.value),
                    updateTime
                );
                await network.provider.send("evm_mine");
            }
            
            const finalTime = nextPeriod + WEEK - 1n;
            await time.setNextBlockTimestamp(Number(finalTime));
            const average = await timeWeightedAverage.calculateAverage(finalTime);
            
            expect(average).to.be.closeTo(
                ethers.parseEther("175"),
                ethers.parseEther("1")
            );
        });
    });

    describe("Integration Tests", () => {
        it("should work with gauge period emissions", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await time.setNextBlockTimestamp(Number(currentTime));
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );
            
            // Simulate daily updates
            for (let i = 1n; i <= 7n; i++) {
                const updateTime = nextPeriod + (i * DAY);
                await time.setNextBlockTimestamp(Number(updateTime));
                
                const newValue = BigInt(1000) - (i * BigInt(100));
                await timeWeightedAverage.updateValue(
                    ethers.parseEther(newValue.toString()),
                    updateTime
                );
            }
            
            const finalTime = nextPeriod + WEEK;
            const avgValue = await timeWeightedAverage.calculateAverage(finalTime);
            
            expect(avgValue).to.be.closeTo(
                ethers.parseEther("700"),
                ethers.parseEther("1")
            );
        });
    });

    describe("Edge Cases", () => {
        it("should handle zero weight periods", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await expect(
                timeWeightedAverage.createPeriod(
                    nextPeriod,
                    WEEK,
                    ethers.parseEther("100"),
                    0n
                )
            ).to.be.revertedWithCustomError(timeWeightedAverage, "ZeroWeight");
        });

        it("should handle maximum values", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 2n) * WEEK;
            const maxValue = ethers.MaxUint256 / ethers.parseEther("2");
            
            // Move to just before period start
            await time.setNextBlockTimestamp(Number(nextPeriod - 1n));
            await network.provider.send("evm_mine");
            
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                maxValue,
                ethers.parseEther("1")
            );

            // Update halfway through period
            const updateTime = nextPeriod + (WEEK / 2n);
            await time.setNextBlockTimestamp(Number(updateTime));
            await timeWeightedAverage.updateValue(maxValue, updateTime);
            await network.provider.send("evm_mine");

            const checkTime = updateTime + DAY;
            await time.setNextBlockTimestamp(Number(checkTime));
            const average = await timeWeightedAverage.calculateAverage(checkTime);
            expect(average).to.equal(maxValue);
        });

        it("should handle minimum duration periods", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await time.setNextBlockTimestamp(Number(currentTime));
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                1n, // Minimum duration of 1 second
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );

            const checkTime = nextPeriod + 1n;
            const average = await timeWeightedAverage.calculateAverage(checkTime);
            expect(average).to.equal(ethers.parseEther("100"));
        });

        it("should handle zero duration periods", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await expect(
                timeWeightedAverage.createPeriod(
                    nextPeriod,
                    0n,
                    ethers.parseEther("100"),
                    ethers.parseEther("1")
                )
            ).to.be.revertedWithCustomError(timeWeightedAverage, "ZeroDuration");
        });
    });

    describe("Fuzz Testing", () => {
        it("should handle random period durations", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            const minDuration = Number(DAY);
            const maxDuration = Number(WEEK);
            const randomDuration = BigInt(
                Math.floor(Math.random() * (maxDuration - minDuration + 1)) + minDuration
            );
            
            await time.setNextBlockTimestamp(Number(currentTime));
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                randomDuration,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );
            
            // Verify period details
            const period = await timeWeightedAverage.getPeriodDetails();
            expect(period.endTime - period.startTime).to.equal(randomDuration);
        });

        it("should handle random value updates", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await time.setNextBlockTimestamp(Number(currentTime));
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );

            // Perform random updates
            for (let i = 1; i <= 5; i++) {
                const randomValue = Math.floor(Math.random() * 1000) + 1;
                const updateTime = nextPeriod + (BigInt(i) * DAY);
                await time.setNextBlockTimestamp(Number(updateTime));
                await timeWeightedAverage.updateValue(
                    ethers.parseEther(randomValue.toString()),
                    updateTime
                );
            }

            const finalTime = nextPeriod + WEEK;
            const average = await timeWeightedAverage.calculateAverage(finalTime);
            expect(average).to.not.equal(0);
        });
    });

    describe("Gas Optimization", () => {
        it("should be gas efficient for period creation", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await time.setNextBlockTimestamp(Number(currentTime));
            const gasEstimate = await timeWeightedAverage.createPeriod.estimateGas(
                nextPeriod,
                WEEK,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );
            
            expect(gasEstimate).to.be.below(160000n);
        });

        it("should be gas efficient for period updates", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await time.setNextBlockTimestamp(Number(currentTime));
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );
            
            const updateTime = nextPeriod + DAY;
            await time.setNextBlockTimestamp(Number(updateTime));
            const gasEstimate = await timeWeightedAverage.updateValue.estimateGas(
                ethers.parseEther("200"),
                updateTime
            );
            
            expect(gasEstimate).to.be.below(100000n);
        });

        it("should be gas efficient for average calculations", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await time.setNextBlockTimestamp(Number(currentTime));
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );
            
            const checkTime = nextPeriod + (WEEK / 2n);
            const gasEstimate = await timeWeightedAverage.calculateAverage.estimateGas(checkTime);
            
            expect(gasEstimate).to.be.below(50000n);
        });
    });

    describe("veToken Integration", () => {
        it("should handle 4-year lock periods", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            const YEAR = 365n * 24n * 3600n;
            
            await time.setNextBlockTimestamp(Number(nextPeriod));
            await timeWeightedAverage.createPeriod(
                nextPeriod + 1n,
                YEAR * 4n,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );

            // Simulate quarterly updates over 4 years
            for (let i = 1n; i <= 16n; i++) {
                const updateTime = nextPeriod + ((YEAR * i) / 4n);
                if (updateTime >= nextPeriod + (YEAR * 4n)) break;
                
                await time.setNextBlockTimestamp(Number(updateTime));
                
                const newValue = BigInt(100) + (i * BigInt(10));
                await timeWeightedAverage.updateValue(
                    ethers.parseEther(newValue.toString()),
                    updateTime
                );
                await network.provider.send("evm_mine");
            }

            const checkTime = nextPeriod + (YEAR * 4n) - 1n;
            await time.setNextBlockTimestamp(Number(checkTime));
            const average = await timeWeightedAverage.calculateAverage(checkTime);
            
            expect(average).to.be.gt(ethers.parseEther("150"));
        });
    });

    describe("Security", () => {
        // it("should validate period timestamps", async () => {
        //     const currentTime = BigInt(await time.latest());
            
        //     await expect(
        //         timeWeightedAverage.createPeriod(
        //             currentTime, // Try to create period with current time
        //             WEEK,
        //             ethers.parseEther("100"),
        //             ethers.parseEther("1")
        //         )
        //     ).to.be.revertedWithCustomError(timeWeightedAverage, "InvalidStartTime");
        // });
        // PWe had a createPeriod function that would actually check, it requires every period to be created with a future timestamp
        // It was since removed and as such its tests are no longer relevant

        it("should prevent overflow in calculations", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            const maxValue = ethers.MaxUint256;
            
            await time.setNextBlockTimestamp(Number(currentTime));
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                maxValue,
                ethers.parseEther("1")
            );

            const updateTime = nextPeriod + DAY;
            await time.setNextBlockTimestamp(Number(updateTime));
            await expect(
                timeWeightedAverage.updateValue(maxValue, updateTime)
            ).to.be.revertedWithCustomError(timeWeightedAverage, "ValueOverflow");
        });

        it("should prevent zero weight periods", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 1n) * WEEK;
            
            await expect(
                timeWeightedAverage.createPeriod(
                    nextPeriod,
                    WEEK,
                    ethers.parseEther("100"),
                    0n
                )
            ).to.be.revertedWithCustomError(timeWeightedAverage, "ZeroWeight");
        });
    });

    describe("Intermediate Tests", () => {
        it("should handle two periods with equal duration", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 2n) * WEEK;
            
            // Move to just before period start
            await time.setNextBlockTimestamp(Number(nextPeriod - 1n));
            await network.provider.send("evm_mine");
            
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );

            // First half of the period
            const midPoint = nextPeriod + (WEEK / 2n);
            await time.setNextBlockTimestamp(Number(midPoint));
            await timeWeightedAverage.updateValue(
                ethers.parseEther("200"),
                midPoint
            );
            await network.provider.send("evm_mine");

            // Check at midpoint
            const average = await timeWeightedAverage.calculateAverage(midPoint);
            
            // Since the value changes at midPoint, the average up to midPoint is 100
            expect(average).to.be.closeTo(
                ethers.parseEther("100"), // Corrected expected value
                ethers.parseEther("1")
            );
        });

        it("should handle three sequential periods", async () => {
            const currentTime = BigInt(await time.latest());
            const nextPeriod = ((currentTime / WEEK) + 2n) * WEEK;
            
            // Move to just before period start
            await time.setNextBlockTimestamp(Number(nextPeriod - 1n));
            await network.provider.send("evm_mine");
            
            await timeWeightedAverage.createPeriod(
                nextPeriod,
                WEEK,
                ethers.parseEther("100"),
                ethers.parseEther("1")
            );

            // Create three sequential updates
            const updates = [
                { timeOffset: WEEK / 3n, value: "150" },
                { timeOffset: (WEEK * 2n) / 3n, value: "200" },
                { timeOffset: WEEK - 1n, value: "250" }
            ];

            for (const update of updates) {
                const updateTime = nextPeriod + update.timeOffset;
                await time.setNextBlockTimestamp(Number(updateTime));
                await timeWeightedAverage.updateValue(
                    ethers.parseEther(update.value),
                    updateTime
                );
                await network.provider.send("evm_mine");
            }

            const finalTime = nextPeriod + WEEK - 1n;
            await time.setNextBlockTimestamp(Number(finalTime));
            const average = await timeWeightedAverage.calculateAverage(finalTime);
            
            // Expected average considering time weights
            expect(average).to.be.closeTo(
                ethers.parseEther("150"), // 
                ethers.parseEther("1")
            );
        });
    });
});