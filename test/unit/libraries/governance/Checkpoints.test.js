import { expect } from "chai";
import hre from "hardhat";
const { ethers, network } = hre;

describe("Checkpoints", () => {
    let checkpoints;
    let mockUser;

    beforeEach(async () => {
        const [signer] = await ethers.getSigners();
        mockUser = signer;
        
        const CheckpointsMock = await ethers.getContractFactory("CheckpointsMock");
        checkpoints = await CheckpointsMock.deploy();
        // await checkpoints.deployed();
    });

    describe("writeCheckpoint", () => {
        it("should write first checkpoint correctly", async () => {
            const value = ethers.parseEther("100");
            const tx = await checkpoints.writeCheckpoint(value);
            const block = await ethers.provider.getBlock(tx.blockNumber);
            
            const [blockNumber, newValue] = await checkpoints.getLatestCheckpoint();
            expect(blockNumber).to.equal(block.number);
            expect(newValue).to.equal(value);
        });

        it("should update existing checkpoint in same block", async () => {
            const value1 = ethers.parseEther("100");
            const value2 = ethers.parseEther("200");
            
            await checkpoints.writeCheckpoint(value1);
            await checkpoints.writeCheckpoint(value2);
            
            const [, newValue] = await checkpoints.getLatestCheckpoint();
            expect(newValue).to.equal(value2);
        });

        it("should handle multiple checkpoints", async () => {
            await checkpoints.writeCheckpoint(ethers.parseEther("100"));
            await ethers.provider.send("evm_mine", []);
            await checkpoints.writeCheckpoint(ethers.parseEther("200"));
            await ethers.provider.send("evm_mine", []);
            await checkpoints.writeCheckpoint(ethers.parseEther("300"));
            
            expect(await checkpoints.length()).to.equal(3);
        });
    });

    describe("findCheckpoint", () => {
        before(async () => {
            // Reset the contract state
            const CheckpointsMock = await ethers.getContractFactory("CheckpointsMock");
            checkpoints = await CheckpointsMock.deploy();
            // await checkpoints.deployed();
        });

        it("should return 0 for empty checkpoints", async () => {
            const value = await checkpoints.findCheckpoint(0);
            expect(value).to.equal(0);
        });

        it("should find correct checkpoint with binary search", async () => {
            // Create multiple checkpoints
            for (let i = 1; i <= 5; i++) {
                await checkpoints.writeCheckpoint(ethers.parseEther(i.toString()));
                await ethers.provider.send("evm_mine", []);
            }

            const block3 = (await checkpoints.getAllCheckpoints())[2];
            const value = await checkpoints.findCheckpoint(block3.fromBlock);
            expect(value).to.equal(ethers.parseEther("3"));
        });

        it("should handle future blocks correctly", async () => {
            await expect(
                checkpoints.findCheckpoint(999999999)
            ).to.be.revertedWithCustomError(checkpoints, "FutureBlockQuery");
        });
    });

    describe("Gas optimization", () => {
        it("should be gas efficient for writes", async () => {
            const tx = await checkpoints.writeCheckpoint(ethers.parseEther("100"));
            const receipt = await tx.wait();
            expect(receipt.gasUsed).to.be.below(100000);
        });

        it("should be gas efficient for reads", async () => {
            // First create a checkpoint to read
            const checkpointTx = await checkpoints.writeCheckpoint(ethers.parseEther("100"));
            const checkpointReceipt = await checkpointTx.wait();
            expect(checkpointReceipt.gasUsed).to.be.below(100000);
            
            // Measure gas for read operation
            const gasEstimate = await ethers.provider.estimateGas({
                to: checkpoints.target,
                data: checkpoints.interface.encodeFunctionData("findCheckpoint", [0])
            });
            expect(gasEstimate).to.be.below(50000);
        });
    });
});