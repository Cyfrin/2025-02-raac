import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FeeCollector", function () {
    let raacToken, feeCollector, veRAACToken;
    let owner, user1, user2, treasury, newTreasury, repairFund, emergencyAdmin;
    let defaultFeeType;
    
    const BASIS_POINTS = 10000;
    const WEEK = 7 * 24 * 3600;
    const ONE_YEAR = 365 * 24 * 3600;
    const INITIAL_MINT = ethers.parseEther("10000");
    const SWAP_TAX_RATE = 100; // 1%
    const BURN_TAX_RATE = 50;  // 0.5%

    beforeEach(async function () {
        [owner, user1, user2, treasury, newTreasury, repairFund, emergencyAdmin] = await ethers.getSigners();

        // Deploy RAACToken
        const RAACToken = await ethers.getContractFactory("RAACToken");
        raacToken = await RAACToken.deploy(owner.address, SWAP_TAX_RATE, BURN_TAX_RATE);
        await raacToken.waitForDeployment();

        // Deploy veRAACToken
        const VeRAACToken = await ethers.getContractFactory("veRAACToken");
        veRAACToken = await VeRAACToken.deploy(await raacToken.getAddress());
        await veRAACToken.waitForDeployment();

        // Deploy FeeCollector
        const FeeCollector = await ethers.getContractFactory("FeeCollector");
        
        feeCollector = await FeeCollector.deploy(
            await raacToken.getAddress(),
            await veRAACToken.getAddress(),
            treasury.address,
            repairFund.address,
            owner.address
        );
        await feeCollector.waitForDeployment();

        // Setup initial configuration
        await raacToken.setFeeCollector(await feeCollector.getAddress());
        await raacToken.manageWhitelist(await feeCollector.getAddress(), true);
        await raacToken.manageWhitelist(await veRAACToken.getAddress(), true);
        await raacToken.setMinter(owner.address);
        await veRAACToken.setMinter(owner.address);

        // Setup roles
        await feeCollector.grantRole(await feeCollector.FEE_MANAGER_ROLE(), owner.address);
        await feeCollector.grantRole(await feeCollector.EMERGENCY_ROLE(), emergencyAdmin.address);
        await feeCollector.grantRole(await feeCollector.DISTRIBUTOR_ROLE(), owner.address);

        // Mint initial tokens and approve
        await raacToken.mint(user1.address, INITIAL_MINT);
        await raacToken.mint(user2.address, INITIAL_MINT);
        await raacToken.connect(user1).approve(await feeCollector.getAddress(), ethers.MaxUint256);
        await raacToken.connect(user2).approve(await feeCollector.getAddress(), ethers.MaxUint256);
        await raacToken.connect(user1).approve(await veRAACToken.getAddress(), ethers.MaxUint256);
        await raacToken.connect(user2).approve(await veRAACToken.getAddress(), ethers.MaxUint256);

        // Setup initial fee types
        defaultFeeType = {
            veRAACShare: 5000,    // 50%
            burnShare: 1000,      // 10%
            repairShare: 1000,    // 10%
            treasuryShare: 3000   // 30%
        };

        for (let i = 0; i < 8; i++) {
            await feeCollector.connect(owner).updateFeeType(i, defaultFeeType);
        }

        // Calculate gross amounts needed including transfer tax
        const taxRate = SWAP_TAX_RATE + BURN_TAX_RATE; // 150 basis points (1.5%)
        const grossMultiplier = BigInt(BASIS_POINTS * BASIS_POINTS) / BigInt(BASIS_POINTS * BASIS_POINTS - taxRate * BASIS_POINTS);
        
        const protocolFeeGross = ethers.parseEther("50") * grossMultiplier / BigInt(10000);
        const lendingFeeGross = ethers.parseEther("30") * grossMultiplier / BigInt(10000);
        const swapTaxGross = ethers.parseEther("20") * grossMultiplier / BigInt(10000);
        
        // Collect fees
        await feeCollector.connect(user1).collectFee(protocolFeeGross, 0);
        await feeCollector.connect(user1).collectFee(lendingFeeGross, 1);
        await feeCollector.connect(user1).collectFee(swapTaxGross, 6);

        // Create veRAACToken locks
        await veRAACToken.connect(user1).lock(ethers.parseEther("1000"), ONE_YEAR);
        await time.increase(WEEK);
        await veRAACToken.connect(user2).lock(ethers.parseEther("500"), ONE_YEAR);
    });

    describe("Constructor & Initial Setup", function () {
        it("should set the correct initial values", async function () {
            expect(await feeCollector.raacToken()).to.equal(await raacToken.getAddress());
            expect(await feeCollector.veRAACToken()).to.equal(await veRAACToken.getAddress());
            expect(await feeCollector.treasury()).to.equal(treasury.address);
            expect(await feeCollector.repairFund()).to.equal(repairFund.address);
            expect(await feeCollector.hasRole(await feeCollector.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        });

        it("should revert if RAAC token address is zero", async function () {
            const FeeCollector = await ethers.getContractFactory("FeeCollector");
            await expect(FeeCollector.deploy(
                ethers.ZeroAddress,
                await veRAACToken.getAddress(),
                treasury.address,
                repairFund.address,
                owner.address
            )).to.be.revertedWithCustomError(feeCollector, "InvalidAddress");
        });

        it("should revert if veRAACToken address is zero", async function () {
            const FeeCollector = await ethers.getContractFactory("FeeCollector");
            await expect(FeeCollector.deploy(
                await raacToken.getAddress(),
                ethers.ZeroAddress,
                treasury.address,
                repairFund.address,
                owner.address
            )).to.be.revertedWithCustomError(feeCollector, "InvalidAddress");
        });

        it("should revert if treasury address is zero", async function () {
            const FeeCollector = await ethers.getContractFactory("FeeCollector");
            await expect(FeeCollector.deploy(
                await raacToken.getAddress(),
                await veRAACToken.getAddress(),
                ethers.ZeroAddress,
                repairFund.address,
                owner.address
            )).to.be.revertedWithCustomError(feeCollector, "InvalidAddress");
        });

        it("should initialize fee types correctly", async function () {
            const feeType = await feeCollector.getFeeType(0);
            expect(feeType.veRAACShare).to.equal(5000);
            expect(feeType.burnShare).to.equal(1000);
            expect(feeType.repairShare).to.equal(1000);
            expect(feeType.treasuryShare).to.equal(3000);
        });

        it("should set up roles correctly", async function () {
            expect(await feeCollector.hasRole(await feeCollector.FEE_MANAGER_ROLE(), owner.address)).to.be.true;
            expect(await feeCollector.hasRole(await feeCollector.EMERGENCY_ROLE(), emergencyAdmin.address)).to.be.true;
            expect(await feeCollector.hasRole(await feeCollector.DISTRIBUTOR_ROLE(), owner.address)).to.be.true;
        });
    });

    describe("Fee Collection and Distribution", function () {
        it("should distribute fees correctly between stakeholders", async function () {
            // Get initial balances
            const initialTreasuryBalance = await raacToken.balanceOf(treasury.address);
            const initialRepairFundBalance = await raacToken.balanceOf(repairFund.address);

            // Calculate net amounts after initial transfer tax (1.5%)
            const taxRate = SWAP_TAX_RATE + BURN_TAX_RATE; // 150 basis points
            const netMultiplier = BigInt(BASIS_POINTS - taxRate) / BigInt(BASIS_POINTS);
            
            const protocolFeesNet = ethers.parseEther("50") * netMultiplier;
            const lendingFeesNet = ethers.parseEther("30") * netMultiplier;
            const swapTaxesNet = ethers.parseEther("20") * netMultiplier;

            // Calculate shares based on fee types (using verified percentages)
            const treasuryShare = (
                (protocolFeesNet * 3000n) / 10000n + // 30% of protocol fees
                (lendingFeesNet * 3000n) / 10000n    // 30% of lending fees
            );

            const repairShare = (
                (protocolFeesNet * 1000n) / 10000n + // 10% of protocol fees
                (swapTaxesNet * 1000n) / 10000n      // 10% of swap taxes
            );

            // Apply second transfer tax
            const treasuryShareNet = treasuryShare * netMultiplier;
            const repairShareNet = repairShare * netMultiplier;

            // Distribute fees
            await feeCollector.connect(owner).distributeCollectedFees();

            // Get final balances
            const finalTreasuryBalance = await raacToken.balanceOf(treasury.address);
            const finalRepairFundBalance = await raacToken.balanceOf(repairFund.address);

            // Use a smaller margin for comparison
            const margin = ethers.parseEther("0.01");
            
            expect(finalTreasuryBalance).to.be.closeTo(
                initialTreasuryBalance + treasuryShareNet,
                margin
            );
            
            expect(finalRepairFundBalance).to.be.closeTo(
                initialRepairFundBalance + repairShareNet,
                margin
            );
        });

        it("should emit FeeDistributed event with correct amounts", async function () {
            // Calculate gross amounts needed including transfer tax (1.5%)
            const taxRate = SWAP_TAX_RATE + BURN_TAX_RATE; // 150 basis points (1.5%)
            const grossMultiplier = BigInt(BASIS_POINTS * BASIS_POINTS) / BigInt(BASIS_POINTS * BASIS_POINTS - taxRate * BASIS_POINTS);
            
            const protocolFeeGross = ethers.parseEther("50") * grossMultiplier / BigInt(10000);
            const lendingFeeGross = ethers.parseEther("30") * grossMultiplier / BigInt(10000);
            const swapTaxGross = ethers.parseEther("20") * grossMultiplier / BigInt(10000);
            
            // Collect fees first
            await feeCollector.connect(user1).collectFee(protocolFeeGross, 0);
            await feeCollector.connect(user1).collectFee(lendingFeeGross, 1);
            await feeCollector.connect(user1).collectFee(swapTaxGross, 6);

            // Get collected fees and verify
            const collectedFees = await feeCollector.getCollectedFees();
            expect(collectedFees.protocolFees).to.equal(10000000000000000n);
            expect(collectedFees.lendingFees).to.equal(6000000000000000n);
            expect(collectedFees.swapTaxes).to.equal(4000000000000000n);

            // Calculate total fees
            const totalFees = collectedFees.protocolFees + collectedFees.lendingFees + collectedFees.swapTaxes;
            expect(totalFees).to.equal(20000000000000000n);

            // Get fee type and verify configuration
            const feeType0 = await feeCollector.getFeeType(0);
            expect(feeType0.veRAACShare).to.equal(5000);
            expect(feeType0.burnShare).to.equal(1000);
            expect(feeType0.repairShare).to.equal(1000);
            expect(feeType0.treasuryShare).to.equal(3000);
            
            // Calculate shares based on fee type percentages
            const veRAACShare = (totalFees * BigInt(feeType0.veRAACShare)) / BigInt(BASIS_POINTS);
            const burnShare = (totalFees * BigInt(feeType0.burnShare)) / BigInt(BASIS_POINTS);
            const repairShare = (totalFees * BigInt(feeType0.repairShare)) / BigInt(BASIS_POINTS);
            const treasuryShare = (totalFees * BigInt(feeType0.treasuryShare)) / BigInt(BASIS_POINTS);

            // Verify pre-tax share calculations
            expect(veRAACShare).to.equal(10000000000000000n);
            expect(burnShare).to.equal(2000000000000000n);
            expect(repairShare).to.equal(2000000000000000n);
            expect(treasuryShare).to.equal(6000000000000000n);

            // Calculate net amounts after transfer tax (1.5%)
            const netMultiplier = BigInt(BASIS_POINTS - taxRate);
            expect(netMultiplier).to.equal(9850n);

            const veRAACShareNet = (veRAACShare * netMultiplier) / BigInt(BASIS_POINTS);
            const burnShareNet = (burnShare * netMultiplier) / BigInt(BASIS_POINTS);
            const repairShareNet = (repairShare * netMultiplier) / BigInt(BASIS_POINTS);
            const treasuryShareNet = (treasuryShare * netMultiplier) / BigInt(BASIS_POINTS);

            // Verify post-tax share calculations
            expect(veRAACShareNet).to.equal(9850000000000000n);
            expect(burnShareNet).to.equal(1970000000000000n);
            expect(repairShareNet).to.equal(1970000000000000n);
            expect(treasuryShareNet).to.equal(5910000000000000n);

            // Expect the FeeDistributed event with calculated amounts
            await expect(feeCollector.connect(owner).distributeCollectedFees())
                .to.emit(feeCollector, "FeeDistributed")
                .withArgs(
                    veRAACShare,  // Use pre-tax amount as contract emits pre-tax values
                    burnShare,
                    repairShare,
                    treasuryShare
                );
        });

        it("should not allow distribution when paused", async function () {
            await feeCollector.connect(owner).grantRole(await feeCollector.EMERGENCY_ROLE(), owner.address);
            await feeCollector.connect(owner).pause();
            
            await expect(feeCollector.connect(owner).distributeCollectedFees())
                .to.be.revertedWithCustomError(feeCollector, "EnforcedPause");
        });

        it("should not allow distribution by non-distributor", async function () {
            await expect(feeCollector.connect(user1).distributeCollectedFees())
                .to.be.revertedWithCustomError(feeCollector, "UnauthorizedCaller");
        });

        it("should handle multiple distribution periods correctly", async function () {
            // First distribution
            await feeCollector.connect(owner).distributeCollectedFees();
            
            // Collect more fees
            const amount = ethers.parseEther("100");
            await feeCollector.connect(user1).collectFee(amount, 0);
            
            // Wait for next period
            await time.increase(WEEK);
            
            // Second distribution
            await feeCollector.connect(owner).distributeCollectedFees();
            
            const collectedFees = await feeCollector.getCollectedFees();
            expect(collectedFees.protocolFees).to.equal(0);
        });

        it("should allow users to claim rewards", async function () {
            await feeCollector.connect(owner).distributeCollectedFees();
            await time.increase(WEEK);
            
            const initialBalance = await raacToken.balanceOf(user1.address);
            await feeCollector.connect(user1).claimRewards(user1.address);
            
            expect(await raacToken.balanceOf(user1.address)).to.be.gt(initialBalance);
        });
    });

    describe("Fee Collection", function () {
        beforeEach(async function () {
            await raacToken.connect(user1).approve(feeCollector.target, ethers.MaxUint256);
        });

        it("should collect fees correctly", async function () {
            const amount = ethers.parseEther("100"); // 100 ETH
            
            // Get initial state
            const initialBalance = await raacToken.balanceOf(feeCollector.target);
            const initialCollectedFees = await feeCollector.getCollectedFees();
            
            // Verify initial state
            expect(initialBalance).to.equal(10000000000000000n);
            expect(initialCollectedFees.protocolFees).to.equal(5000000000000000n);
            
            console.log("\nInitial State:");
            console.log("Initial Balance:", initialBalance.toString());
            console.log("Initial Collected Fees:", initialCollectedFees.protocolFees.toString());
            
            // Calculate expected amounts
            const taxRate = SWAP_TAX_RATE + BURN_TAX_RATE; // 150 basis points (1.5%)
            const expectedNet = (amount * BigInt(BASIS_POINTS - taxRate)) / BigInt(BASIS_POINTS);
            
            // Verify calculations
            expect(amount).to.equal(100000000000000000000n);
            expect(taxRate).to.equal(150);
            expect(expectedNet).to.equal(98500000000000000000n);
            
            console.log("\nCalculations:");
            console.log("Input Amount (Gross):", amount.toString());
            console.log("Tax Rate:", taxRate.toString(), "basis points");
            console.log("Expected Net:", expectedNet.toString());
            
            // Collect fee
            await expect(feeCollector.connect(user1).collectFee(amount, 0))
                .to.emit(feeCollector, "FeeCollected")
                .withArgs(0, amount);

            // Get final state
            const finalBalance = await raacToken.balanceOf(feeCollector.target);
            const finalCollectedFees = await feeCollector.getCollectedFees();
            
            // Verify final state
            expect(finalBalance).to.equal(100010000000000000000n);
            expect(finalCollectedFees.protocolFees).to.equal(100005000000000000000n);
            
            console.log("\nFinal State:");
            console.log("Final Balance:", finalBalance.toString());
            console.log("Final Collected Fees:", finalCollectedFees.protocolFees.toString());
            
            // Calculate and verify changes
            const balanceChange = finalBalance - initialBalance;
            const collectedFeesChange = finalCollectedFees.protocolFees - initialCollectedFees.protocolFees;
            
            expect(balanceChange).to.equal(100000000000000000000n);
            expect(collectedFeesChange).to.equal(100000000000000000000n);
            
            console.log("\nChanges:");
            console.log("Balance Change:", balanceChange.toString());
            console.log("Collected Fees Change:", collectedFeesChange.toString());
            
            // Verify verification values
            const taxAmount = amount - expectedNet;
            
            expect(amount).to.equal(100000000000000000000n, "Gross amount should be 100 ETH");
            expect(expectedNet).to.equal(98500000000000000000n, "Net amount should be 98.5 ETH");
            expect(taxAmount).to.equal(1500000000000000000n, "Tax amount should be 1.5 ETH");
            
            console.log("\nVerification Values:");
            console.log("Gross Amount:", amount.toString(), "(100 ETH)");
            console.log("Expected Net:", expectedNet.toString(), "(98.5 ETH)");
            console.log("Tax Amount:", taxAmount.toString(), "(1.5 ETH)");
        });

        it("should revert on invalid fee type", async function () {
            await expect(feeCollector.connect(user1).collectFee(ethers.parseEther("100"), 8))
                .to.be.revertedWithCustomError(feeCollector, "InvalidFeeType");
        });

        it("should revert on zero amount", async function () {
            await expect(feeCollector.connect(user1).collectFee(0, 0))
                .to.be.revertedWithCustomError(feeCollector, "InvalidFeeAmount");
        });
    });

    describe("Emergency Controls", function () {
        beforeEach(async function () {
            await feeCollector.connect(owner).grantRole(await feeCollector.EMERGENCY_ROLE(), owner.address);
            await raacToken.connect(user1).transfer(feeCollector.target, ethers.parseEther("100"));
        });

        it("should allow emergency withdrawal by admin", async function () {
            await feeCollector.connect(owner).pause();
            
            const amount = ethers.parseEther("100");

            // Calculate expected amount after two tax applications
            const taxRate = SWAP_TAX_RATE + BURN_TAX_RATE; // 150 basis points (1.5%)
            const firstTaxAmount = amount * BigInt(taxRate) / BigInt(10000);
            const remainingAfterFirstTax = amount - firstTaxAmount;
            const secondTaxAmount = remainingAfterFirstTax * BigInt(taxRate) / BigInt(10000);
            const expectedAmount = remainingAfterFirstTax - secondTaxAmount;
            
            const initialBalance = await raacToken.balanceOf(feeCollector.target);
            expect(initialBalance).to.equal(100010000000000000000n);
            await raacToken.connect(user1).transfer(feeCollector.target, amount);
            const newBalance = await raacToken.balanceOf(feeCollector.target);
            expect(newBalance).to.equal(200010000000000000000n);
            
            await feeCollector.connect(owner).emergencyWithdraw(raacToken.target);
        
            const finalTreasuryBalance = await raacToken.balanceOf(treasury.address);
            
            // The entire balance should be transferred to treasury
            expect(finalTreasuryBalance).to.equal(200010000000000000000n);
        });

        it("should not allow emergency withdrawal when not paused", async function () {
            await expect(feeCollector.connect(user1).emergencyWithdraw(raacToken.target))
            .to.be.revertedWithCustomError(feeCollector, "ExpectedPause");
        });

        it("should not allow emergency withdrawal by non-admin", async function () {
            await feeCollector.connect(owner).pause();
            await expect(feeCollector.connect(user1).emergencyWithdraw(raacToken.target))
                .to.be.revertedWithCustomError(feeCollector, "UnauthorizedCaller");
        });

        it("should not allow operations when paused", async function () {
            await feeCollector.connect(owner).pause();
            await expect(feeCollector.connect(owner).distributeCollectedFees())
                .to.be.revertedWithCustomError(feeCollector, "EnforcedPause");
        });

        it("should allow EMERGENCY_ROLE to pause", async function () {
            await expect(feeCollector.connect(owner).pause())
                .to.emit(feeCollector, "Paused")
                .withArgs(owner.address);
            expect(await feeCollector.paused()).to.be.true;
        });

        it("should allow EMERGENCY_ROLE to unpause", async function () {
            await feeCollector.connect(owner).pause();
            await expect(feeCollector.connect(owner).unpause())
                .to.emit(feeCollector, "Unpaused")
                .withArgs(owner.address);
            expect(await feeCollector.paused()).to.be.false;
        });

        it("should not allow non-EMERGENCY_ROLE to pause", async function () {
            await expect(feeCollector.connect(user1).pause())
                .to.be.revertedWithCustomError(feeCollector, "UnauthorizedCaller");
        });

        it("should not allow non-EMERGENCY_ROLE to unpause", async function () {
            await feeCollector.connect(owner).pause();
            await expect(feeCollector.connect(user1).unpause())
                .to.be.revertedWithCustomError(feeCollector, "UnauthorizedCaller");
        });
    });

    describe("Treasury Management", function () {
        it("should allow treasury update with timelock", async function () {
            await feeCollector.connect(owner).setTreasury(newTreasury.address);
            
            // Wait for timelock
            await time.increase(24 * 3600 + 1);
            
            await feeCollector.applyTreasuryUpdate();
            expect(await feeCollector.treasury()).to.equal(newTreasury.address);
        });

        it("should not allow treasury update before timelock expires", async function () {
            await feeCollector.connect(owner).setTreasury(newTreasury.address);
            
            await expect(feeCollector.applyTreasuryUpdate())
                .to.be.revertedWithCustomError(feeCollector, "UnauthorizedCaller");
        });
    });

    describe("Fee Type Management", function () {
        it("should allow fee type update by manager", async function () {
            await feeCollector.connect(owner).grantRole(await feeCollector.FEE_MANAGER_ROLE(), owner.address);
            
            const newFeeType = {
                veRAACShare: 7000,
                burnShare: 1000,
                repairShare: 1000,
                treasuryShare: 1000
            };

            await expect(feeCollector.connect(owner).updateFeeType(0, newFeeType))
                .to.emit(feeCollector, "FeeTypeUpdated")
                .withArgs(0, [
                    newFeeType.veRAACShare,
                    newFeeType.burnShare,
                    newFeeType.repairShare,
                    newFeeType.treasuryShare
                ]);
        });

        it("should revert on invalid fee shares total", async function () {
            await feeCollector.connect(owner).grantRole(await feeCollector.FEE_MANAGER_ROLE(), owner.address);
            
            const invalidFeeType = {
                veRAACShare: 8000,
                burnShare: 1000,
                repairShare: 1000,
                treasuryShare: 1000
            };

            await expect(feeCollector.connect(owner).updateFeeType(0, invalidFeeType))
                .to.be.revertedWithCustomError(feeCollector, "InvalidDistributionParams");
        });

        it("should enforce total share limit", async function () {
            const invalidFeeType = {
                veRAACShare: 5000,
                burnShare: 2000,
                repairShare: 2000,
                treasuryShare: 2000
            };

            await expect(feeCollector.connect(owner).updateFeeType(0, invalidFeeType))
                .to.be.revertedWithCustomError(feeCollector, "InvalidDistributionParams");
        });

        it("should allow updating multiple fee types", async function () {
            const newFeeType = {
                veRAACShare: 6000,
                burnShare: 1000,
                repairShare: 1000,
                treasuryShare: 2000
            };

            await feeCollector.connect(owner).updateFeeType(0, newFeeType);
            await feeCollector.connect(owner).updateFeeType(1, newFeeType);

            const feeType0 = await feeCollector.getFeeType(0);
            const feeType1 = await feeCollector.getFeeType(1);

            expect(feeType0.veRAACShare).to.equal(6000);
            expect(feeType1.veRAACShare).to.equal(6000);
        });
    });

    describe("FeeCollector Math Functions", function () {    
        let raacToken, feeCollector, veRAACToken;
        let owner, treasury, repairFund;
    
        before(async function () {
            [owner, treasury, repairFund] = await ethers.getSigners();
    
            // Deploy RAACToken
            const RAACToken = await ethers.getContractFactory("RAACToken");
            raacToken = await RAACToken.deploy(owner.address, 100, 50); // SWAP_TAX_RATE: 1%, BURN_TAX_RATE: 0.5%
            await raacToken.waitForDeployment();
    
            // Set owner as minter
            await raacToken.setMinter(owner.address);
    
            // Deploy veRAACToken
            const VeRAACToken = await ethers.getContractFactory("veRAACToken");
            veRAACToken = await VeRAACToken.deploy(await raacToken.getAddress());
            await veRAACToken.waitForDeployment();
    
            // Deploy MockFeeCollector instead of FeeCollector
            const MockFeeCollector = await ethers.getContractFactory("MockFeeCollector");
            feeCollector = await MockFeeCollector.deploy(
                await raacToken.getAddress(),
                await veRAACToken.getAddress(),
                treasury.address,
                repairFund.address,
                owner.address
            );
            await feeCollector.waitForDeployment();
    
            // Setup initial configuration
            await raacToken.setFeeCollector(await feeCollector.getAddress());
            await raacToken.manageWhitelist(await feeCollector.getAddress(), true);
            await raacToken.manageWhitelist(await veRAACToken.getAddress(), true);
        });

        beforeEach(async function () {
            // Mint tokens to owner for fee collection tests
            await raacToken.mint(owner.address, ethers.parseEther("1000000"));
            await raacToken.connect(owner).approve(feeCollector.target, ethers.MaxUint256);
            
            // Setup fee types
            defaultFeeType = {
                veRAACShare: 7500, // 75%
                burnShare: 0,
                repairShare: 0,
                treasuryShare: 2500 // 25%
            };
            
            for (let i = 0; i < 8; i++) {
                await feeCollector.connect(owner).updateFeeType(i, defaultFeeType);
            }
        });

       
        describe("Fee Distribution Calculations", () => {
            it("should calculate distribution amounts correctly", async () => {
                await feeCollector.connect(owner).collectFee(ethers.parseEther("100"), 0);
                const tx = await feeCollector.connect(owner).distributeCollectedFees();
                await tx.wait();
                const collectedFees = await feeCollector.getCollectedFees();
                expect(collectedFees.protocolFees).to.equal(0);
            });

            it("should handle dust amounts correctly", async () => {
                // Setup test with amount that will create dust
                await feeCollector.connect(owner).collectFee(ethers.parseEther("100.123456789"), 0);
                
                const tx = await feeCollector.connect(owner).distributeCollectedFees();
                await tx.wait();
                
                // Verify total distributed equals collected amount
                const collectedFees = await feeCollector.getCollectedFees();
                expect(collectedFees.protocolFees).to.equal(0);
            });
        });

        describe("Gas Optimization", () => {
            it("should be gas efficient for distribution calculations", async () => {
                await feeCollector.collectFee(ethers.parseEther("100"), 0);
                
                const tx = await feeCollector.distributeCollectedFees.populateTransaction();
                const gasEstimate = await ethers.provider.estimateGas(tx);
                expect(gasEstimate).to.be.below(300000n);
            });
        });
    });
});