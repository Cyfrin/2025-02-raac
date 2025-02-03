import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";


describe("RAACToken", () => {
    let raacToken;
    let veRAACToken;
    let feeCollector;
    let treasury;
    let owner;
    let users;

    const INITIAL_SUPPLY = BigInt("100000000000000000000000000"); // 100M tokens
    const TAX_RATE = 200n; // 2% in basis points
    const BURN_RATE = 50n; // 0.5% in basis points
    const REPAIR_FUND_RATE = 100n; // 1% in basis points

    beforeEach(async () => {
        // Get signers
        [owner, ...users] = await ethers.getSigners();

        // Deploy core contracts
        const RAACToken = await ethers.getContractFactory("RAACToken", owner);
        raacToken = await RAACToken.deploy(
            owner.address,    // initial owner
            TAX_RATE,        // initial swap tax rate
            BURN_RATE        // initial burn tax rate
        );

        // Deploy veRAACToken
        const VeRAACToken = await ethers.getContractFactory("veRAACToken");
        veRAACToken = await VeRAACToken.deploy(await raacToken.getAddress());
        await veRAACToken.waitForDeployment();

        const Treasury = await ethers.getContractFactory("Treasury", owner);
        treasury = await Treasury.deploy(owner.address);

        const FeeCollector = await ethers.getContractFactory("FeeCollector", owner);
        feeCollector = await FeeCollector.deploy(
            await raacToken.getAddress(),
            await veRAACToken.getAddress(),
            await treasury.getAddress(),
            await treasury.getAddress(), // Using treasury as repair fund for test
            owner.address
        );

        // Setup
        await raacToken.setFeeCollector(feeCollector.target);
        // Set owner as minter
        await raacToken.setMinter(owner.address);
    });

    describe("Tax Calculation", () => {
        it("should calculate and distribute taxes correctly", async () => {
            const transferAmount = BigInt("1000000000000000000000"); // 1000 tokens
            const expectedTax = (transferAmount * TAX_RATE) / 10000n;
            const expectedBurn = (transferAmount * BURN_RATE) / 10000n;

            // Mint tokens to first user (using owner who is now minter)
            await raacToken.mint(users[0].address, transferAmount);

            // Track balances before transfer
            const initialSupply = await raacToken.totalSupply();
            const initialFeeCollector = await raacToken.balanceOf(feeCollector.target);

            // Perform transfer
            await raacToken.connect(users[0]).transfer(users[1].address, transferAmount);

            // Verify tax distribution
            expect(await raacToken.balanceOf(feeCollector.target))
                .to.equal(expectedTax);
            expect(await raacToken.totalSupply())
                .to.equal(initialSupply - expectedBurn);

            // Verify recipient received correct amount
            const expectedRecipientAmount = transferAmount - expectedTax - expectedBurn;
            expect(await raacToken.balanceOf(users[1].address))
                .to.equal(expectedRecipientAmount);
        });
    });

    describe("Whitelist Functionality", () => {
        it("should handle whitelist operations correctly", async () => {
            const whitelistedContract = users[5].address;
            const transferAmount = BigInt("1000000000000000000000"); // 1000 tokens

            // Add to whitelist
            await raacToken.manageWhitelist(whitelistedContract, true);
            expect(await raacToken.isWhitelisted(whitelistedContract)).to.be.true;

            // Mint tokens to first user (using owner who is now minter)
            await raacToken.mint(users[0].address, transferAmount);

            // Transfer without tax for whitelisted
            await raacToken.connect(users[0]).transfer(whitelistedContract, transferAmount);

            // Verify no tax was taken
            expect(await raacToken.balanceOf(whitelistedContract)).to.equal(transferAmount);
        });
    });

    describe("Emergency Controls", () => {
        // TODO: RAAC is the only one without pausability, probably for the better, but marked as todo if any..
        // it("should handle emergency pause correctly", async () => {
        //     // Enable emergency pause
        //     await raacToken.connect(owner).pause();
        //     expect(await raacToken.paused()).to.be.true;

        //     // Verify transfers are blocked
        //     await expect(
        //         raacToken.connect(users[0]).transfer(users[1].address, 100)
        //     ).to.be.revertedWith("Token transfers paused");

        //     // Unpause and verify transfers work
        //     await raacToken.connect(owner).unpause();
        //     expect(await raacToken.paused()).to.be.false;
        // });
    });

    describe("Access Control", () => {
        it("should enforce proper access control", async () => {
            // Non-owner cannot set tax rates
            await expect(
                raacToken.connect(users[0]).setSwapTaxRate(100n)
            ).to.be.revertedWithCustomError(raacToken, "OwnableUnauthorizedAccount");

            await expect(
                raacToken.connect(users[0]).setBurnTaxRate(50n)
            ).to.be.revertedWithCustomError(raacToken, "OwnableUnauthorizedAccount");

            // Non-owner cannot add to whitelist
            await expect(
                raacToken.connect(users[0]).manageWhitelist(users[1].address, true)
            ).to.be.revertedWithCustomError(raacToken, "OwnableUnauthorizedAccount");

            // Owner actions - need smaller increments
            const currentSwapRate = await raacToken.swapTaxRate();
            const currentBurnRate = await raacToken.burnTaxRate();
            
            // Set small changes within the increment limit
            await raacToken.setSwapTaxRate(currentSwapRate + 5n);
            await raacToken.setBurnTaxRate(currentBurnRate + 5n);
            await raacToken.manageWhitelist(users[1].address, true);
        });
    });

    describe("Integration with veRAACToken", () => {
        it("should handle veRAACToken integration correctly", async () => {
            const lockAmount = ethers.parseEther("1000");
            
            // Deploy veRAACToken
            const VeRAACToken = await ethers.getContractFactory("veRAACToken");
            veRAACToken = await VeRAACToken.deploy(raacToken.target);
            await veRAACToken.waitForDeployment();

            // Whitelist veRAACToken to avoid taxes
            await raacToken.manageWhitelist(veRAACToken.target, true);

            // Mint tokens to user
            await raacToken.mint(users[0].address, lockAmount);
            await raacToken.connect(users[0]).approve(veRAACToken.target, lockAmount);

            // Create lock in veRAACToken
            await veRAACToken.connect(users[0]).lock(
                lockAmount,
                365n * 24n * 3600n // 1 year
            );

            // Verify tokens transferred correctly
            expect(await raacToken.balanceOf(veRAACToken.target)).to.equal(lockAmount);
        });
    });

    describe("Fee Rate Management", () => {
        it("should not allow tax rates to exceed 10%", async function () {
            // Set increment limit to maximum allowed (10%)
            await raacToken.setTaxRateIncrementLimit(1000n);
            
            // Get current rate
            let currentRate = await raacToken.swapTaxRate();
            const targetRate = 999n;
            
            // Increase in steps that respect the increment limit
            while (currentRate < targetRate) {
                // Calculate maximum allowed increase (10% of current rate)
                const maxStep = (currentRate * 1000n) / 10000n; // 10% of current rate
                const nextRate = currentRate + maxStep;
                
                // If next step would exceed target, use target instead
                const rateToSet = nextRate > targetRate ? targetRate : nextRate;
                await raacToken.setSwapTaxRate(rateToSet);
                
                currentRate = await raacToken.swapTaxRate();
            }
            
            // Verify we reached the target rate
            expect(await raacToken.swapTaxRate()).to.equal(targetRate);
            
            // Test exceeding max rate (1000 basis points = 10%)
            await expect(raacToken.setSwapTaxRate(1001n))
                .to.be.revertedWithCustomError(raacToken, "TaxRateExceedsLimit");
            
            // Test burn tax rate as well
            await expect(raacToken.setBurnTaxRate(1001n))
                .to.be.revertedWithCustomError(raacToken, "TaxRateExceedsLimit");
        });

        it("should not allow tax rate changes exceeding increment limit per update", async function () {
            // Set a small increment limit
            await raacToken.setTaxRateIncrementLimit(10n);
            
            const initialSwapTaxRate = await raacToken.swapTaxRate();
            const initialBurnTaxRate = await raacToken.burnTaxRate();

            // Try to increase by more than allowed
            await expect(
                raacToken.setSwapTaxRate(initialSwapTaxRate + 11n)
            ).to.be.revertedWithCustomError(
                raacToken,
                "TaxRateChangeExceedsAllowedIncrement"
            );

            await expect(
                raacToken.setBurnTaxRate(initialBurnTaxRate + 11n)
            ).to.be.revertedWithCustomError(
                raacToken,
                "TaxRateChangeExceedsAllowedIncrement"
            );
        });
    });

    describe("FeeCollector Removal", () => {
        it("should allow tax-free transfers when fee collector is removed", async function () {
            const transferAmount = ethers.parseEther("1000");
            await raacToken.mint(users[0].address, transferAmount);
            
            // Remove fee collector
            await raacToken.connect(owner).setFeeCollector(ethers.ZeroAddress);
            
            // Transfer should not incur fees
            await raacToken.connect(users[0]).transfer(users[1].address, transferAmount);
            expect(await raacToken.balanceOf(users[1].address)).to.equal(transferAmount);
        });
    });

    describe("Tax Rate Protection Mechanisms", () => {
        async function incrementallySetRate(token, targetRate, isSwapRate = true) {
            const getCurrentRate = async () => 
                isSwapRate ? await token.swapTaxRate() : await token.burnTaxRate();
            
            const setRate = async (rate) => 
                isSwapRate ? await token.setSwapTaxRate(rate) : await token.setBurnTaxRate(rate);

            let currentRate = await getCurrentRate();
            // console.log(`Starting rate change from ${currentRate} to ${targetRate}`);
            
            // If target is same as current, no change needed
            if (currentRate === targetRate) {
                return;
            }

            while (currentRate !== targetRate) {
                const incrementLimit = await token.taxRateIncrementLimit();
                // Calculate max change allowed (exactly as per contract)
                const maxChange = currentRate * incrementLimit / 10000n;
                
                // If maxChange is 0 and we still need to decrease, force a minimum change of 1
                const effectiveMaxChange = maxChange === 0n && currentRate > targetRate ? 1n : maxChange;
                
                let nextRate;
                if (currentRate < targetRate) {
                    // Increasing
                    const maxAllowedIncrease = currentRate + effectiveMaxChange;
                    nextRate = targetRate <= maxAllowedIncrease ? targetRate : maxAllowedIncrease;
                } else {
                    // Decreasing
                    const maxAllowedDecrease = effectiveMaxChange;
                    const rateDecrease = currentRate - targetRate > maxAllowedDecrease ? 
                        maxAllowedDecrease : currentRate - targetRate;
                    nextRate = currentRate - rateDecrease;
                }
                
                // Break if we can't make progress
                if (nextRate === currentRate) {
                    // console.log(`Cannot make further progress. Stuck at rate ${currentRate}`);
                    break;
                }
                
                // console.log(`Changing rate from ${currentRate} to ${nextRate} (max change: ${effectiveMaxChange})`);
                await setRate(nextRate);
                currentRate = await getCurrentRate();
            }

            // Verify final rate
            const finalRate = await getCurrentRate();
            if (finalRate !== targetRate) {
                throw new Error(`Failed to reach target rate. Current: ${finalRate}, Target: ${targetRate}`);
            }
        }

        describe("Edge Cases", () => {
            it("should handle minimum rate changes correctly", async function () {
                // Test minimum rate change (1 basis point)
                const currentRate = await raacToken.swapTaxRate();
                const targetRate = currentRate + 1n;
                
                await raacToken.setTaxRateIncrementLimit(1000n);
                await raacToken.setSwapTaxRate(targetRate);
                
                expect(await raacToken.swapTaxRate()).to.equal(targetRate);
            });

            it("should prevent zero-rate intermediate steps", async function () {
                // Set a low initial rate
                await incrementallySetRate(raacToken, 10n, true);
                
                // Try to decrease to zero
                await expect(raacToken.setSwapTaxRate(0n))
                    .to.be.revertedWithCustomError(raacToken, "TaxRateChangeExceedsAllowedIncrement");
            });

            it("should handle rate changes near zero correctly", async function () {
                // Start from a low rate
                await incrementallySetRate(raacToken, 5n, true);
                
                // Try to decrease by small amounts
                const currentRate = await raacToken.swapTaxRate();
                const decreaseAmount = (currentRate * 1000n) / 10000n; // 10% decrease
                
                if (decreaseAmount === 0n) {
                    // If calculated decrease would be 0, should use 1 as minimum
                    await raacToken.setSwapTaxRate(currentRate - 1n);
                } else {
                    await raacToken.setSwapTaxRate(currentRate - decreaseAmount);
                }
                
                expect(await raacToken.swapTaxRate()).to.be.lt(currentRate);
            });
        });

        it("should verify tax calculations with different rates", async function () {
            this.timeout(60000);
            const transferAmount = BigInt("1000000000000000000000"); // 1000 tokens
            
            // Start with smaller changes
            const testRates = [
                { swap: 150n, burn: 75n },  // Small increase
                { swap: 100n, burn: 50n },  // Small decrease
                { swap: 50n, burn: 25n },   // Larger decrease
                { swap: 10n, burn: 5n }     // Final decrease
            ];

            // Set increment limit
            await raacToken.setTaxRateIncrementLimit(1000n); // 10%

            for (const rates of testRates) {
                // console.log(`\nTesting new rates - swap: ${rates.swap}, burn: ${rates.burn}`);
                
                // Reset balances
                const user0Balance = await raacToken.balanceOf(users[0].address);
                if (user0Balance > 0n) {
                    await raacToken.connect(users[0]).transfer(owner.address, user0Balance);
                }
                
                // Set rates incrementally
                await incrementallySetRate(raacToken, rates.swap, true);
                await incrementallySetRate(raacToken, rates.burn, false);
                
                // Verify rates
                const currentSwap = await raacToken.swapTaxRate();
                const currentBurn = await raacToken.burnTaxRate();
                // console.log(`Verified rates - swap: ${currentSwap}, burn: ${currentBurn}`);
                
                expect(currentSwap).to.equal(rates.swap, "Swap rate not set correctly");
                expect(currentBurn).to.equal(rates.burn, "Burn rate not set correctly");
                
                // Test transfer
                await raacToken.mint(users[0].address, transferAmount);
                
                const expectedTax = (transferAmount * rates.swap) / 10000n;
                const expectedBurn = (transferAmount * rates.burn) / 10000n;
                const expectedRecipient = transferAmount - expectedTax - expectedBurn;
                
                const initialBalances = {
                    feeCollector: await raacToken.balanceOf(feeCollector.target),
                    recipient: await raacToken.balanceOf(users[1].address),
                    supply: await raacToken.totalSupply()
                };
                
                await raacToken.connect(users[0]).transfer(users[1].address, transferAmount);
                
                // Verify balances
                expect(await raacToken.balanceOf(users[1].address))
                    .to.equal(initialBalances.recipient + expectedRecipient, "Recipient balance incorrect");
                expect(await raacToken.balanceOf(feeCollector.target))
                    .to.equal(initialBalances.feeCollector + expectedTax, "Fee collector balance incorrect");
                expect(await raacToken.totalSupply())
                    .to.equal(initialBalances.supply - expectedBurn, "Total supply incorrect after burn");
            }
        });

        it("should handle high tax rates correctly", async function () {
            this.timeout(60000);
            await raacToken.setTaxRateIncrementLimit(1000n);
            
            const highRates = { swap: 900n, burn: 50n }; // 9% swap, 0.5% burn
            
            // Set rates incrementally
            await incrementallySetRate(raacToken, highRates.swap, true);  // swap rate
            await incrementallySetRate(raacToken, highRates.burn, false); // burn rate
            
            // Verify rates were set correctly
            expect(await raacToken.swapTaxRate()).to.equal(highRates.swap);
            expect(await raacToken.burnTaxRate()).to.equal(highRates.burn);
            
            const transferAmount = BigInt("1000000000000000000000"); // 1000 tokens
            await raacToken.mint(users[0].address, transferAmount);
            
            const expectedTax = (transferAmount * highRates.swap) / 10000n;
            const expectedBurn = (transferAmount * highRates.burn) / 10000n;
            const expectedRecipient = transferAmount - expectedTax - expectedBurn;
            
            const initialSupply = await raacToken.totalSupply();
            
            await raacToken.connect(users[0]).transfer(users[1].address, transferAmount);
            
            expect(await raacToken.balanceOf(users[1].address))
                .to.equal(expectedRecipient, "High tax rate: Recipient balance incorrect");
            expect(await raacToken.totalSupply())
                .to.equal(initialSupply - expectedBurn, "High tax rate: Total supply incorrect after burn");
        });

        it("should enforce increment limits for decreasing tax rates", async function () {
            // Set initial high rate (within limits)
            await raacToken.setTaxRateIncrementLimit(1000n);
            let currentRate = await raacToken.swapTaxRate();
            
            // Try to decrease by more than allowed
            const targetRate = currentRate - (currentRate * 1100n) / 10000n; // Try 11% decrease
            await expect(raacToken.setSwapTaxRate(targetRate))
                .to.be.revertedWithCustomError(raacToken, "TaxRateChangeExceedsAllowedIncrement");
        });

        it("should enforce BASE_INCREMENT_LIMIT for tax rate increment limit", async function () {
            // Try to set increment limit above BASE_INCREMENT_LIMIT (1000)
            await expect(raacToken.setTaxRateIncrementLimit(1001n))
                .to.be.revertedWithCustomError(raacToken, "IncrementLimitExceedsBaseLimit");
        });

        it("should handle zero address checks properly", async function () {
            await expect(raacToken.setMinter(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(raacToken, "InvalidAddress");

            await expect(raacToken.manageWhitelist(ethers.ZeroAddress, true))
                .to.be.revertedWithCustomError(raacToken, "CannotWhitelistZeroAddress");

            await expect(raacToken.manageWhitelist(ethers.ZeroAddress, false))
                .to.be.revertedWithCustomError(raacToken, "CannotRemoveZeroAddressFromWhitelist");
        });

        it("should handle whitelist duplicate operations", async function () {
            const testAddress = users[1].address;
            
            // Add to whitelist
            await raacToken.manageWhitelist(testAddress, true);
            
            // Try to add again
            await expect(raacToken.manageWhitelist(testAddress, true))
                .to.be.revertedWithCustomError(raacToken, "AddressAlreadyWhitelisted");
                
            // Remove from whitelist
            await raacToken.manageWhitelist(testAddress, false);
            
            // Try to remove again
            await expect(raacToken.manageWhitelist(testAddress, false))
                .to.be.revertedWithCustomError(raacToken, "AddressNotWhitelisted");
        });
    });
});

// Helper function to set tax rates incrementally
async function setTaxRatesIncrementally(token, targetSwapRate, targetBurnRate) {
    const currentSwapRate = await token.swapTaxRate();
    const currentBurnRate = await token.burnTaxRate();
    
    // Set maximum allowed increment
    await token.setTaxRateIncrementLimit(1000n);
    
    // Helper function to adjust rate incrementally
    async function adjustRate(currentRate, targetRate, setterFunction) {
        let rate = currentRate;
        while (rate !== targetRate) {
            const step = (rate * 1000n) / 10000n; // 10% step
            let nextRate;
            if (rate < targetRate) {
                nextRate = rate + step > targetRate ? targetRate : rate + step;
            } else {
                nextRate = rate - step < targetRate ? targetRate : rate - step;
            }
            await setterFunction(nextRate);
            rate = nextRate;
        }
    }
    
    // Adjust both rates
    await adjustRate(currentSwapRate, targetSwapRate, 
        (rate) => token.setSwapTaxRate(rate));
    await adjustRate(currentBurnRate, targetBurnRate, 
        (rate) => token.setBurnTaxRate(rate));
}