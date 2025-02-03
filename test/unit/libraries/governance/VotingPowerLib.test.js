import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("VotingPowerLib", () => {
    let votingPower;
    let mockUser;
    let PRECISION = 1n * 10n ** 18n;

    beforeEach(async () => {
        const [signer] = await ethers.getSigners();
        mockUser = signer;
        
        // Deploy RAACVoting library first
        const RAACVotingLib = await ethers.getContractFactory("RAACVoting");
        const raacVotingLib = await RAACVotingLib.deploy();
        await raacVotingLib.waitForDeployment();

        // Deploy VotingPowerMock with linked library
        const VotingPowerMock = await ethers.getContractFactory("VotingPowerMock", {
            libraries: {
                RAACVoting: await raacVotingLib.getAddress()
            }
        });
        votingPower = await VotingPowerMock.deploy();
        await votingPower.waitForDeployment();
    });

    describe("Basic Functionality", () => {
        let unlockTime;
        it("should calculate and update power correctly", async () => {
            const amount = ethers.parseEther("1000");
            const duration = 365 * 24 * 3600; // 1 year
            unlockTime = (await ethers.provider.getBlock('latest')).timestamp + duration;

            const tx = await votingPower.calculateAndUpdatePower(
                mockUser.address,
                amount,
                unlockTime
            );
            await tx.wait();

            const power = await votingPower.getCurrentPower(mockUser.address);
            expect(power).to.be.gt(0);
            expect(power).to.be.lte(amount);
            expect(power).to.be.closeTo(250n * PRECISION, PRECISION);
        });

        it("should handle checkpoints correctly", async () => {
            const power = ethers.parseEther("1000");
            const newPower = ethers.parseEther("2000");
            const duration = 365 * 24 * 3600; // 1 year
            unlockTime = (await ethers.provider.getBlock('latest')).timestamp + duration;

            try {
                await votingPower.getLastAccountCheckpoint(mockUser.address);
                throw new Error("Expected error not thrown");
            } catch (error) {
                expect(error.message).to.include("No checkpoints for account");
            }
            // First checkpoint
            const tx = await votingPower.writeCheckpoint(
                mockUser.address,
                power // newPower
            );
            await tx.wait();
            const initialCheckpoint = await votingPower.getLastAccountCheckpoint(mockUser.address);
            expect(initialCheckpoint.value).to.equal(power);

            // Second checkpoint
            const tx2 = await votingPower.writeCheckpoint(
                mockUser.address,
                newPower // newPower
            );
            await tx2.wait();
            const latestCheckpoint = await votingPower.getLastAccountCheckpoint(mockUser.address);
            expect(latestCheckpoint.value).to.equal(newPower);
        });
    });

    describe("Property-based tests", () => {
        it("should maintain power decay over time", async () => {
            const amount = ethers.parseEther("1000");
            const duration = 365 * 24 * 3600; // 1 year
            
            // Get precise timestamp
            const latestBlock = await ethers.provider.getBlock('latest');
            const currentTime = latestBlock.timestamp;
            const unlockTime = currentTime + duration;

            // Calculate and update initial power
            const tx = await votingPower.calculateAndUpdatePower(
                mockUser.address,
                amount,
                unlockTime
            );
            const receipt = await tx.wait();

            // Get point data for debugging
            const point = await votingPower.getPoint(mockUser.address);

            // Get initial power
            const initialPower = await votingPower.getCurrentPower(mockUser.address);

            // Verify initial state
            expect(initialPower).to.be.gt(0, "Initial power should be greater than 0");
            expect(initialPower).to.be.lte(amount, "Initial power should not exceed locked amount");
            

            // // Time travel to 1 day later
            // const oneDayLater = currentTime + 24 * 3600;
            // await ethers.provider.send("evm_setNextBlockTimestamp", [oneDayLater]);
            // await ethers.provider.send("evm_mine", []);

            // One block later
            await ethers.provider.send("evm_mine", []);

            const oneDayLaterPower = await votingPower.getCurrentPower(mockUser.address);

            // Time travel 
            const halfDuration = Math.floor(duration / 2);
            await ethers.provider.send("evm_setNextBlockTimestamp", [currentTime + halfDuration]);
            await ethers.provider.send("evm_mine", []);
            
            // Verify new timestamp
            const midBlock = await ethers.provider.getBlock('latest');
           

            const midPower = await votingPower.getCurrentPower(mockUser.address);
            
            // Verify power decay
            expect(midPower).to.be.lt(initialPower, "Power should decrease over time");
            expect(midPower).to.be.gt(0, "Power should not decay to zero mid-duration");
            // Calculate and verify linear decay
            const expectedDecay = (initialPower * BigInt(halfDuration)) / BigInt(duration);
            const actualDecay = initialPower - midPower;
            const tolerance = initialPower / 100n; // 1% tolerance
            
            expect(actualDecay).to.be.closeTo(
                expectedDecay,
                tolerance,
                "Decay should be roughly linear"
            );
        });
    });
});
