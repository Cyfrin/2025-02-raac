import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
const { MaxUint256 } = ethers;

describe("PowerCheckpoint", () => {
    let powerCheckpoint;
    let mockUser;

    beforeEach(async () => {
        const [signer] = await ethers.getSigners();
        mockUser = signer;
        
        const PowerCheckpointMock = await ethers.getContractFactory("PowerCheckpointMock");
        powerCheckpoint = await PowerCheckpointMock.deploy();
    });

    describe("Basic Functionality", () => {
        it("should write and read checkpoints correctly", async () => {
            const power = ethers.parseEther("100");
            await powerCheckpoint.writeCheckpoint(mockUser.address, power);
            
            await ethers.provider.send("evm_mine", []);
            
            const latestBlock = await ethers.provider.getBlockNumber();
            const storedPower = await powerCheckpoint.getPastVotingPower(
                mockUser.address,
                latestBlock - 1
            );
            
            expect(storedPower).to.equal(power);
        });

        it("should handle multiple checkpoints for same user", async () => {
            const powers = [100, 200, 300].map(x => ethers.parseEther(x.toString()));
            
            for (const power of powers) {
                await powerCheckpoint.writeCheckpoint(mockUser.address, power);
                await ethers.provider.send("evm_mine", []);
            }

            const blocks = await Promise.all(
                powers.map(async (_, i) => powerCheckpoint.getCheckpointBlock(i))
            );

            for (let i = 0; i < powers.length; i++) {
                const power = await powerCheckpoint.getPastVotingPower(
                    mockUser.address,
                    blocks[i]
                );
                expect(power).to.equal(powers[i]);
            }
        });
    });

    describe("Property-based tests", () => {
        it("should maintain power history integrity", async () => {
            const powers = Array(10).fill(0).map(() => 
                ethers.parseEther((Math.random() * 1000).toFixed(18))
            );

            for (const power of powers) {
                await powerCheckpoint.writeCheckpoint(mockUser.address, power);
                await ethers.provider.send("evm_mine", []);
            }

            const latestBlock = await ethers.provider.getBlockNumber();
            const historicalPowers = await Promise.all(
                Array(10).fill(0).map((_, i) => 
                    powerCheckpoint.getPastVotingPower(
                        mockUser.address,
                        latestBlock - (10 - i)
                    )
                )
            );

            expect(historicalPowers[historicalPowers.length - 1]).to.equal(powers[powers.length - 1]);
        });
    });

    describe("Edge Cases", () => {
        it("should handle zero power updates", async () => {
            await powerCheckpoint.writeCheckpoint(mockUser.address, 0);
            
            await ethers.provider.send("evm_mine", []);
            
            const latestBlock = await ethers.provider.getBlockNumber();
            const power = await powerCheckpoint.getPastVotingPower(
                mockUser.address,
                latestBlock - 1
            );
            expect(power).to.equal(0);
        });

        it("should handle max uint256 power", async () => {
            const maxPower = MaxUint256;
            await expect(
                powerCheckpoint.writeCheckpoint(mockUser.address, maxPower)
            ).to.be.revertedWithCustomError(powerCheckpoint, "PowerTooHigh");
        });
    });

    describe("Stress Testing", () => {
        it("should handle rapid checkpoint creation", async () => {
            const checkpointCount = 100;
            for (let i = 0; i < checkpointCount; i++) {
                await powerCheckpoint.writeCheckpoint(
                    mockUser.address,
                    ethers.parseEther((i + 1).toString())
                );
                await ethers.provider.send("evm_mine", []);
            }
            
            const latestBlock = await ethers.provider.getBlockNumber();
            const finalPower = await powerCheckpoint.getPastVotingPower(
                mockUser.address,
                latestBlock - 1
            );
            
            expect(finalPower).to.equal(ethers.parseEther(checkpointCount.toString()));
        });
    });
});
