import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("TimelockController", () => {
    let timelock;
    let testTarget;
    let owner;
    let proposer;
    let executor;
    let other;
    
    const MIN_DELAY = 2 * 24 * 3600; // 2 days
    const MAX_DELAY = 30 * 24 * 3600; // 30 days
    const GRACE_PERIOD = 14 * 24 * 3600; // 14 days

    beforeEach(async () => {
        [owner, proposer, executor, other] = await ethers.getSigners();

        // Deploy test target contract for testing operations
        const TimelockTestTarget = await ethers.getContractFactory("TimelockTestTarget");
        testTarget = await TimelockTestTarget.deploy();
        await testTarget.waitForDeployment();

        // Deploy timelock
        const TimelockController = await ethers.getContractFactory("TimelockController");
        timelock = await TimelockController.deploy(
            MIN_DELAY,
            [await proposer.getAddress()],
            [await executor.getAddress()],
            await owner.getAddress()
        );
        await timelock.waitForDeployment();
    });

    describe("Initialization", () => {
        it("should set up roles correctly", async () => {
            expect(await timelock.hasRole(await timelock.PROPOSER_ROLE(), await proposer.getAddress())).to.be.true;
            expect(await timelock.hasRole(await timelock.EXECUTOR_ROLE(), await executor.getAddress())).to.be.true;
            expect(await timelock.hasRole(await timelock.DEFAULT_ADMIN_ROLE(), await owner.getAddress())).to.be.true;
        });

        it("should set initial delay correctly", async () => {
            expect(await timelock.getMinDelay()).to.equal(MIN_DELAY);
        });

        it("should revert with invalid delay", async () => {
            const TimelockController = await ethers.getContractFactory("TimelockController");
            await expect(
                TimelockController.deploy(
                    1, // Too short delay
                    [await proposer.getAddress()],
                    [await executor.getAddress()],
                    await owner.getAddress()
                )
            ).to.be.revertedWithCustomError(TimelockController, "InvalidDelay");
        });
    });

    describe("Operation Scheduling", () => {
        let operationId;
        let targets;
        let values;
        let calldatas;
        
        beforeEach(async () => {
            targets = [await testTarget.getAddress()];
            values = [0];
            calldatas = [testTarget.interface.encodeFunctionData("setValue", [42])];
            const salt = ethers.ZeroHash;
            
            const tx = await timelock.connect(proposer).scheduleBatch(
                targets,
                values,
                calldatas,
                ethers.ZeroHash,
                salt,
                MIN_DELAY
            );
            const receipt = await tx.wait();
            
            // Get operation ID from event
            const event = receipt.logs.find(
                log => timelock.interface.parseLog(log)?.name === 'OperationScheduled'
            );
            operationId = timelock.interface.parseLog(event).args.id;
        });

        it("should schedule operation successfully", async () => {
            const id = await timelock.hashOperationBatch(
                targets,
                values,
                calldatas,
                ethers.ZeroHash,
                ethers.ZeroHash
            );
            
            expect(await timelock.isOperationPending(id)).to.be.true;
            
            const timestamp = await timelock.getTimestamp(id);
            expect(timestamp).to.be.gt(0);
        });

        it("should revert when scheduling with insufficient delay", async () => {
            await expect(
                timelock.connect(proposer).scheduleBatch(
                    targets,
                    values,
                    calldatas,
                    ethers.ZeroHash,
                    ethers.ZeroHash,
                    MIN_DELAY - 1
                )
            ).to.be.revertedWithCustomError(timelock, "InvalidDelay");
        });

        it("should revert when scheduling same operation twice", async () => {
            await expect(
                timelock.connect(proposer).scheduleBatch(
                    targets,
                    values,
                    calldatas,
                    ethers.ZeroHash,
                    ethers.ZeroHash,
                    MIN_DELAY
                )
            ).to.be.revertedWithCustomError(timelock, "OperationAlreadyScheduled");
        });
    });

    describe("Operation Execution", () => {
        let operationId;
        let targets;
        let values;
        let calldatas;
        
        beforeEach(async () => {
            targets = [await testTarget.getAddress()];
            values = [0];
            calldatas = [testTarget.interface.encodeFunctionData("setValue", [42])];
            
            await timelock.connect(proposer).scheduleBatch(
                targets,
                values,
                calldatas,
                ethers.ZeroHash,
                ethers.ZeroHash,
                MIN_DELAY
            );
        });

        it("should execute operation after delay", async () => {
            await time.increase(MIN_DELAY);

            await expect(
                timelock.connect(executor).executeBatch(
                    targets,
                    values,
                    calldatas,
                    ethers.ZeroHash,
                    ethers.ZeroHash
                )
            ).to.emit(timelock, "OperationExecuted");

            expect(await testTarget.value()).to.equal(42);
        });

        it("should revert when executing too early", async () => {
            await time.increase(MIN_DELAY - 3600); // 1 hour too early

            await expect(
                timelock.connect(executor).executeBatch(
                    targets,
                    values,
                    calldatas,
                    ethers.ZeroHash,
                    ethers.ZeroHash
                )
            ).to.be.revertedWithCustomError(timelock, "OperationNotReady");
        });

        it("should revert when executing after grace period", async () => {
            await time.increase(MIN_DELAY + GRACE_PERIOD + 1);

            await expect(
                timelock.connect(executor).executeBatch(
                    targets,
                    values,
                    calldatas,
                    ethers.ZeroHash,
                    ethers.ZeroHash
                )
            ).to.be.revertedWithCustomError(timelock, "OperationExpired");
        });
    });

    describe("Operation Cancellation", () => {
        let operationId;
        
        beforeEach(async () => {
            // Grant CANCELLER_ROLE to proposer
            await timelock.connect(owner).grantRole(
                await timelock.CANCELLER_ROLE(),
                await proposer.getAddress()
            );
            
            const tx = await timelock.connect(proposer).scheduleBatch(
                [await testTarget.getAddress()],
                [0],
                [testTarget.interface.encodeFunctionData("setValue", [42])],
                ethers.ZeroHash,
                ethers.id("TEST_OP"),
                MIN_DELAY
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => timelock.interface.parseLog(log)?.name === 'OperationScheduled'
            );
            operationId = timelock.interface.parseLog(event).args.id;
        });

        it("should allow cancellation by authorized role", async () => {
            await expect(timelock.connect(proposer).cancel(operationId))
                .to.emit(timelock, "OperationCancelled")
                .withArgs(operationId);
        });

        it("should prevent execution of cancelled operation", async () => {
            await timelock.connect(proposer).cancel(operationId);
            await time.increase(MIN_DELAY);

            await expect(
                timelock.connect(executor).executeBatch(
                    [await testTarget.getAddress()],
                    [0],
                    [testTarget.interface.encodeFunctionData("setValue", [42])],
                    ethers.ZeroHash,
                    ethers.ZeroHash
                )
            ).to.be.revertedWithCustomError(timelock, "OperationNotFound");
        });

        it("should handle operation with predecessor dependency", async () => {
            // Schedule first operation
            const tx1 = await timelock.connect(proposer).scheduleBatch(
                [await testTarget.getAddress()],
                [0],
                [testTarget.interface.encodeFunctionData("setValue", [1])],
                ethers.ZeroHash,
                ethers.id("FirstOp"),
                MIN_DELAY
            );
            const receipt1 = await tx1.wait();
            const event1 = receipt1.logs.find(
                log => timelock.interface.parseLog(log)?.name === 'OperationScheduled'
            );
            const firstOpId = timelock.interface.parseLog(event1).args.id;

            // Schedule second operation with first as predecessor
            const tx2 = await timelock.connect(proposer).scheduleBatch(
                [await testTarget.getAddress()],
                [0],
                [testTarget.interface.encodeFunctionData("setValue", [2])],
                firstOpId,
                ethers.id("SecondOp"),
                MIN_DELAY
            );

            await time.increase(MIN_DELAY);

            // Try to execute second operation before first (should fail)
            await expect(
                timelock.connect(executor).executeBatch(
                    [await testTarget.getAddress()],
                    [0],
                    [testTarget.interface.encodeFunctionData("setValue", [2])],
                    firstOpId,
                    ethers.id("SecondOp")
                )
            ).to.be.revertedWithCustomError(timelock, "PredecessorNotExecuted");

            // Execute operations in correct order
            await timelock.connect(executor).executeBatch(
                [await testTarget.getAddress()],
                [0],
                [testTarget.interface.encodeFunctionData("setValue", [1])],
                ethers.ZeroHash,
                ethers.id("FirstOp")
            );

            await timelock.connect(executor).executeBatch(
                [await testTarget.getAddress()],
                [0],
                [testTarget.interface.encodeFunctionData("setValue", [2])],
                firstOpId,
                ethers.id("SecondOp")
            );

            expect(await testTarget.value()).to.equal(2);
        });
    });

    describe("Emergency Actions", () => {
        it("should allow emergency action execution", async () => {
            const targets = [await testTarget.getAddress()];
            const values = [0];
            const calldatas = [testTarget.interface.encodeFunctionData("setValue", [911])];
            const operationId = await timelock.hashOperationBatch(
                targets,
                values,
                calldatas,
                ethers.ZeroHash,
                ethers.ZeroHash
            );

            await timelock.connect(owner).scheduleEmergencyAction(operationId);

            await expect(
                timelock.connect(owner).executeEmergencyAction(
                    targets,
                    values,
                    calldatas,
                    ethers.ZeroHash,
                    ethers.ZeroHash
                )
            ).to.emit(timelock, "EmergencyActionExecuted");

            expect(await testTarget.value()).to.equal(911);
        });

        it("should revert emergency action from unauthorized account", async () => {
            await expect(
                timelock.connect(other).scheduleEmergencyAction(ethers.ZeroHash)
            ).to.be.reverted;
        });
    });

    describe("Parameter Management", () => {
        it("should allow updating minimum delay", async () => {
            const newDelay = 3 * 24 * 3600; // 3 days
            
            await expect(timelock.connect(owner).updateDelay(newDelay))
                .to.emit(timelock, "MinDelayChange");
            
            expect(await timelock.getMinDelay()).to.equal(newDelay);
        });

        it("should validate delay bounds", async () => {
            await expect(timelock.connect(owner).updateDelay(MIN_DELAY - 1))
                .to.be.revertedWithCustomError(timelock, "InvalidDelay");
            
            await expect(timelock.connect(owner).updateDelay(MAX_DELAY + 1))
                .to.be.revertedWithCustomError(timelock, "InvalidDelay");
        });
    });

    describe("Integration Scenarios", () => {
        it("should handle multiple operations in sequence", async () => {
            const operations = [];
            
            // Schedule multiple operations
            for (let i = 0; i < 3; i++) {
                const tx = await timelock.connect(proposer).scheduleBatch(
                    [await testTarget.getAddress()],
                    [0],
                    [testTarget.interface.encodeFunctionData("setValue", [i])],
                    ethers.ZeroHash,
                    ethers.id(`Operation${i}`),
                    MIN_DELAY
                );
                const receipt = await tx.wait();
                const event = receipt.logs.find(
                    log => timelock.interface.parseLog(log)?.name === 'OperationScheduled'
                );
                operations.push({
                    id: timelock.interface.parseLog(event).args.id,
                    value: i
                });
            }

            await time.increase(MIN_DELAY);

            // Execute all operations
            for (const op of operations) {
                await timelock.connect(executor).executeBatch(
                    [await testTarget.getAddress()],
                    [0],
                    [testTarget.interface.encodeFunctionData("setValue", [op.value])],
                    ethers.ZeroHash,
                    ethers.id(`Operation${op.value}`)
                );
                expect(await testTarget.value()).to.equal(op.value);
            }
        });

        it("should handle operation with predecessor dependency", async () => {
            // Schedule first operation
            const tx1 = await timelock.connect(proposer).scheduleBatch(
                [await testTarget.getAddress()],
                [0],
                [testTarget.interface.encodeFunctionData("setValue", [1])],
                ethers.ZeroHash,
                ethers.id("FirstOp"),
                MIN_DELAY
            );
            const receipt1 = await tx1.wait();
            const event1 = receipt1.logs.find(
                log => timelock.interface.parseLog(log)?.name === 'OperationScheduled'
            );
            const firstOpId = timelock.interface.parseLog(event1).args.id;

            // Schedule second operation with first as predecessor
            const tx2 = await timelock.connect(proposer).scheduleBatch(
                [await testTarget.getAddress()],
                [0],
                [testTarget.interface.encodeFunctionData("setValue", [2])],
                firstOpId,
                ethers.id("SecondOp"),
                MIN_DELAY
            );

            await time.increase(MIN_DELAY);

            // Try to execute second operation before first (should fail)
            await expect(
                timelock.connect(executor).executeBatch(
                    [await testTarget.getAddress()],
                    [0],
                    [testTarget.interface.encodeFunctionData("setValue", [2])],
                    firstOpId,
                    ethers.id("SecondOp")
                )
            ).to.be.revertedWithCustomError(timelock, "PredecessorNotExecuted");

            // Execute operations in correct order
            await timelock.connect(executor).executeBatch(
                [await testTarget.getAddress()],
                [0],
                [testTarget.interface.encodeFunctionData("setValue", [1])],
                ethers.ZeroHash,
                ethers.id("FirstOp")
            );

            await timelock.connect(executor).executeBatch(
                [await testTarget.getAddress()],
                [0],
                [testTarget.interface.encodeFunctionData("setValue", [2])],
                firstOpId,
                ethers.id("SecondOp")
            );

            expect(await testTarget.value()).to.equal(2);
        });
    });
});
