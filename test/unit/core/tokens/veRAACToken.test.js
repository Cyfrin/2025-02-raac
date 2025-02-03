import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("veRAACToken", () => {
    let veRAACToken;
    let raacToken;
    let owner;
    let users;
    const { MaxUint256 } = ethers;

    const MIN_LOCK_DURATION = 365 * 24 * 3600; // 1 year
    const MAX_LOCK_DURATION = 1460 * 24 * 3600; // 4 years
    const INITIAL_MINT = ethers.parseEther("1000000");
    const BOOST_WINDOW = 7 * 24 * 3600; // 7 days
    const MAX_BOOST = 25000; // 2.5x
    const MIN_BOOST = 10000; // 1x

    async function initializeBoostIfNeeded() {
        const boostWindow = await veRAACToken.getBoostWindow();
        if (boostWindow == 0) {
            // await veRAACToken.initializeBoostCalculator(
            //     BOOST_WINDOW,
            //     MAX_BOOST,
            //     MIN_BOOST
            // );
        }
    }

    beforeEach(async () => {
        [owner, ...users] = await ethers.getSigners();

        // Deploy Mock RAAC Token
        const MockRAACToken = await ethers.getContractFactory("ERC20Mock");
        raacToken = await MockRAACToken.deploy("RAAC Token", "RAAC");
        await raacToken.waitForDeployment();

            // // Deploy RAACVoting library
            // const RAACVoting = await ethers.getContractFactory("RAACVoting");
            // const raacVotingLib = await RAACVoting.deploy();
            // await raacVotingLib.waitForDeployment();
    
            // // Deploy veRAACToken contract
            // const VeRAACToken = await ethers.getContractFactory("veRAACToken", {
            //     libraries: {
            //         RAACVoting: await raacVotingLib.getAddress(),
            //     },
            // });
        // Deploy veRAACToken contract directly without library linking
        const VeRAACToken = await ethers.getContractFactory("veRAACToken");
        veRAACToken = await VeRAACToken.deploy(await raacToken.getAddress());
        await veRAACToken.waitForDeployment();

        // Setup initial token balances and approvals
        for (const user of users.slice(0, 3)) {
            await raacToken.mint(user.address, INITIAL_MINT);
            await raacToken.connect(user).approve(await veRAACToken.getAddress(), MaxUint256);
        }

        // Initialize boost calculator
        await initializeBoostIfNeeded();
    });

    describe("Lock Mechanism", () => {
        it("should allow users to create a lock with valid parameters", async () => {
            const amount = ethers.parseEther("1000");
            const duration = 365 * 24 * 3600; // 1 year
            
            // Create lock first
            const tx = await veRAACToken.connect(users[0]).lock(amount, duration);
            
            // Wait for the transaction
            const receipt = await tx.wait();
            
            // Find the LockCreated event
            const event = receipt.logs.find(
                log => log.fragment && log.fragment.name === 'LockCreated'
            );
            // Get the actual unlock time from the event
            const actualUnlockTime = event.args[2];
            
            // Verify lock position
            const position = await veRAACToken.getLockPosition(users[0].address);
            expect(position.amount).to.equal(amount);
            expect(position.end).to.equal(actualUnlockTime);
            expect(position.power).to.be.gt(0);
            
            // Verify the unlock time is approximately duration seconds from now
            const currentTime = await time.latest();
            expect(actualUnlockTime).to.be.closeTo(currentTime + duration, 5); // Allow 5 seconds deviation
        });

        it("should not allow locking with zero amount", async () => {
            const duration = 365 * 24 * 3600;
            await expect(veRAACToken.connect(users[0]).lock(0, duration))
                .to.be.revertedWithCustomError(veRAACToken, "InvalidAmount");
        });

        it("should not allow locking with duration less than minimum", async () => {
            const amount = ethers.parseEther("1000");
            const duration = MIN_LOCK_DURATION - 1;

            await expect(veRAACToken.connect(users[0]).lock(amount, duration))
                .to.be.revertedWithCustomError(veRAACToken, "InvalidLockDuration");
        });

        it("should not allow locking with duration more than maximum", async () => {
            const amount = ethers.parseEther("1000");
            const duration = MAX_LOCK_DURATION + 1;

            await expect(veRAACToken.connect(users[0]).lock(amount, duration))
                .to.be.revertedWithCustomError(veRAACToken, "InvalidLockDuration");
        });

        it("should not allow locking more than maximum lock amount", async () => {
            const amount = ethers.parseEther("10000001"); // 10,000,001 tokens
            const duration = 365 * 24 * 3600; // 1 year

            await expect(veRAACToken.connect(users[0]).lock(amount, duration))
                .to.be.revertedWithCustomError(veRAACToken, "AmountExceedsLimit");
        });

        it("should allow users to increase lock amount", async () => {
            const initialAmount = ethers.parseEther("1000");
            const additionalAmount = ethers.parseEther("500");
            const duration = 365 * 24 * 3600; // 1 year

            await veRAACToken.connect(users[0]).lock(initialAmount, duration);

            await expect(veRAACToken.connect(users[0]).increase(additionalAmount))
                .to.emit(veRAACToken, "LockIncreased")
                .withArgs(users[0].address, additionalAmount);

            const position = await veRAACToken.getLockPosition(users[0].address);
            expect(position.amount).to.equal(initialAmount + additionalAmount);
        });

        it("should not allow increasing lock amount beyond maximum", async () => {
            const initialAmount = ethers.parseEther("5000000");
            const additionalAmount = ethers.parseEther("6000000");
            const duration = 365 * 24 * 3600;

            // Mint enough tokens for the test
            await raacToken.mint(users[0].address, initialAmount + additionalAmount);
            
            await veRAACToken.connect(users[0]).lock(initialAmount, duration);

            await expect(veRAACToken.connect(users[0]).increase(additionalAmount))
                .to.be.revertedWithCustomError(veRAACToken, "AmountExceedsLimit");
        });

        it("should allow users to extend lock duration", async () => {
            const amount = ethers.parseEther("1000");
            const initialDuration = 365 * 24 * 3600; // 1 year
            const extensionDuration = 180 * 24 * 3600; // 6 months
            
            await veRAACToken.connect(users[0]).lock(amount, initialDuration);
            const currentTime = await time.latest();
            const newUnlockTime = currentTime + initialDuration + extensionDuration;
            
            await expect(veRAACToken.connect(users[0]).extend(extensionDuration))
                .to.emit(veRAACToken, "LockExtended")
                .withArgs(users[0].address, newUnlockTime);
        });

        it("should allow users to withdraw after lock expires", async () => {
            const amount = ethers.parseEther("1000");
            const duration = 365 * 24 * 3600; // 1 year
            
            await veRAACToken.connect(users[0]).lock(amount, duration);
            await time.increase(duration + 1);
            
            const balanceBefore = await raacToken.balanceOf(users[0].address);
            await expect(veRAACToken.connect(users[0]).withdraw())
                .to.emit(veRAACToken, "Withdrawn")
                .withArgs(users[0].address, amount);
                
            const balanceAfter = await raacToken.balanceOf(users[0].address);
            expect(balanceAfter - balanceBefore).to.equal(amount);
        });
    });

    describe("Voting Power Calculations", () => {
        it("should calculate voting power proportionally to lock duration", async () => {
            const amount = ethers.parseEther("1000");
            const shortDuration = 365 * 24 * 3600; // 1 year
            const longDuration = 730 * 24 * 3600; // 2 years
            
            await veRAACToken.connect(users[0]).lock(amount, shortDuration);
            await veRAACToken.connect(users[1]).lock(amount, longDuration);
            
            const shortPower = await veRAACToken.balanceOf(users[0].address);
            const longPower = await veRAACToken.balanceOf(users[1].address);
            
            expect(longPower).to.be.gt(shortPower);
        });

        it("should decay voting power linearly over time", async () => {
            const amount = ethers.parseEther("1000");
            console.log("Test Amount: ", amount);
            const duration = 365 * 24 * 3600; // 1 year
            console.log("Test Duration: ", duration);
            
            await veRAACToken.connect(users[0]).lock(amount, duration);
            const initialPower = await veRAACToken.getVotingPower(users[0].address);
            console.log("Test Initial Power: ", initialPower);
            
            await time.increase(duration / 2);
            
            // Explicitly get the voting power at the new timestamp
            const midPower = await veRAACToken.getVotingPower(users[0].address);
            console.log("Test Mid Power: ", midPower);
            
            expect(midPower).to.be.lt(initialPower);
            expect(midPower).to.be.gt(0);
        });
    });

    describe("Boost Calculations", () => {
        it("should update boost state on lock actions", async () => {
            const amount = ethers.parseEther("1000");
            const duration = 365 * 24 * 3600;
            
            // Create initial lock
            await veRAACToken.connect(users[0]).lock(amount, duration);
            
            // Get boost state
            const boostState = await veRAACToken.getBoostState();
            
            // Check boost is within expected range (10000 = 1x, 25000 = 2.5x)
            expect(boostState.minBoost).to.equal(10000); // 1x
            expect(boostState.maxBoost).to.equal(25000); // 2.5x
            
            // Get current boost for user
            const { boostBasisPoints, boostedAmount } = await veRAACToken.getCurrentBoost(users[0].address);
            
            console.log("Boost Basis Points: ", boostBasisPoints);
            console.log("Boosted Amount: ", boostedAmount);
            // Boost should be between min and max (in basis points)
            expect(boostBasisPoints).to.be.gte(10000); // At least 1x
            expect(boostBasisPoints).to.be.lte(25000); // At most 2.5x
        });
    });

    describe("Transfer Restrictions", () => {
        it("should prevent transfers of veRAAC tokens", async () => {
            const amount = ethers.parseEther("1000");
            const duration = 365 * 24 * 3600;
            
            await veRAACToken.connect(users[0]).lock(amount, duration);
            await expect(veRAACToken.connect(users[0]).transfer(users[1].address, amount))
                .to.be.revertedWithCustomError(veRAACToken, "TransferNotAllowed");
        });
    });

    describe("Emergency Withdrawal", () => {
        const EMERGENCY_DELAY = 3 * 24 * 3600; // 3 days in seconds

        it("should allow users to withdraw during emergency", async () => {
            const amount = ethers.parseEther("1000");
            const duration = 365 * 24 * 3600;
            await raacToken.mint(users[0].address, amount);
            await raacToken.connect(users[0]).approve(await veRAACToken.getAddress(), amount);
            await veRAACToken.connect(users[0]).lock(amount, duration);
            
            // Schedule emergency withdraw action
            const EMERGENCY_WITHDRAW_ACTION = ethers.keccak256(
                ethers.toUtf8Bytes("enableEmergencyWithdraw")
            );
            await veRAACToken.connect(owner).scheduleEmergencyAction(EMERGENCY_WITHDRAW_ACTION);
            
            // Wait for emergency delay
            await time.increase(EMERGENCY_DELAY);
            
            // Enable emergency withdraw
            await veRAACToken.connect(owner).enableEmergencyWithdraw();
            
            // Wait for emergency withdraw delay
            await time.increase(EMERGENCY_DELAY);
            
            // Get initial balances
            const initialBalance = await raacToken.balanceOf(users[0].address);
            
            // Perform emergency withdrawal
            await expect(veRAACToken.connect(users[0]).emergencyWithdraw())
                .to.emit(veRAACToken, "EmergencyWithdrawn")
                .withArgs(users[0].address, amount);
                
            // Verify balance changes
            const finalBalance = await raacToken.balanceOf(users[0].address);
            expect(finalBalance - initialBalance).to.equal(amount);
        });

        it("should not allow emergency withdraw if not enabled", async () => {
            await expect(veRAACToken.connect(users[0]).emergencyWithdraw())
                .to.be.revertedWithCustomError(veRAACToken, "EmergencyWithdrawNotEnabled");
        });

        it("should not allow non-owner to schedule emergency unlock", async () => {
            await expect(veRAACToken.connect(users[0]).scheduleEmergencyUnlock())
                .to.be.revertedWithCustomError(veRAACToken, "OwnableUnauthorizedAccount")
                .withArgs(users[0].address);
        });

        it("should not allow emergency unlock execution before delay", async () => {
            await veRAACToken.connect(owner).scheduleEmergencyUnlock();
            
            await expect(veRAACToken.connect(owner).executeEmergencyUnlock())
                .to.be.revertedWithCustomError(veRAACToken, "EmergencyDelayNotMet");
        });
    });

    describe("Event Emissions", () => {
        it("should emit correct events for all lock operations", async () => {
            const amount = ethers.parseEther("1000");
            const additionalAmount = ethers.parseEther("500");
            const duration = 365 * 24 * 3600;
            const extensionDuration = 180 * 24 * 3600;
            
            // Lock creation
            const tx = await veRAACToken.connect(users[0]).lock(amount, duration);
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment?.name === 'LockCreated');
            const unlockTime = event.args[2];
            
            // Lock amount increase
            await expect(veRAACToken.connect(users[0]).increase(additionalAmount))
                .to.emit(veRAACToken, "LockIncreased")
                .withArgs(users[0].address, additionalAmount);
            
            // Lock duration extension
            const newUnlockTime = BigInt(unlockTime) + BigInt(extensionDuration);
            await expect(veRAACToken.connect(users[0]).extend(extensionDuration))
                .to.emit(veRAACToken, "LockExtended")
                .withArgs(users[0].address, newUnlockTime);
        });
    });

    describe("Error Handling", () => {
        it("should revert when trying to lock without enough RAAC balance", async () => {
            const amount = ethers.parseEther("9900000"); // Very large amount below max lock amount
            const duration = 365 * 24 * 3600;

            // User without any RAAC balance tries to lock
            const userWithoutBalance = users[3];
            
            // Approve first
            await raacToken.connect(userWithoutBalance).approve(
                await veRAACToken.getAddress(), 
                amount
            );

            // Attempt to lock - should fail due to insufficient balance
            await expect(
                veRAACToken.connect(userWithoutBalance).lock(amount, duration)
            ).to.be.revertedWithCustomError(
                raacToken,  //error comes from the RAAC token contract but is the Erc20 default error
                "ERC20InsufficientBalance"
            ).withArgs(
                userWithoutBalance.address,  // from
                0,                          // current balance
                amount                      // required amount
            );
        });

        it("should revert when trying to withdraw without an existing lock", async () => {
            await expect(veRAACToken.connect(users[1]).withdraw())
                .to.be.revertedWithCustomError(veRAACToken, "LockNotFound");
        });

        it("should revert when trying to extend lock beyond maximum duration", async () => {
            const amount = ethers.parseEther("1000");
            const initialDuration = MAX_LOCK_DURATION - 100;
            const extensionDuration = 200;

            // First create a lock
            await raacToken.mint(users[0].address, amount);
            await raacToken.connect(users[0]).approve(await veRAACToken.getAddress(), amount);
            await veRAACToken.connect(users[0]).lock(amount, initialDuration);

            // Try to extend the lock duration
            await expect(veRAACToken.connect(users[0]).extend(extensionDuration))
                .to.be.revertedWithCustomError(veRAACToken, "InvalidLockDuration");
        });

        it("should revert when trying to withdraw from non-existent lock", async () => {
            // Try to withdraw with an account that never created a lock
            await expect(veRAACToken.connect(users[2]).withdraw())
                .to.be.revertedWithCustomError(veRAACToken, "LockNotFound");
        });
    });

});
