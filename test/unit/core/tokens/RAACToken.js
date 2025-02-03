import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("RAACToken and FeeCollector Integration", function () {
    let RAACToken, FeeCollector, RAACMinter, MockLendingPool, MockStabilityPool;
    let raacToken, feeCollector, raacMinter, lendingPool, stabilityPool;
    let owner, user1, user2, treasury;
    const initialSupply = ethers.parseEther("1000000");
  
    beforeEach(async function () {
        [owner, user1, user2, treasury] = await ethers.getSigners();
        
        MockLendingPool = await ethers.getContractFactory("MockLendingPool");
        lendingPool = await MockLendingPool.deploy();

        await lendingPool.mockGetNormalizedDebt(ethers.parseEther("253000"));

        RAACToken = await ethers.getContractFactory("RAACToken");
        raacToken = await RAACToken.deploy(owner.address, 100, 50);
        
        FeeCollector = await ethers.getContractFactory("FeeCollector");
        feeCollector = await FeeCollector.deploy(await raacToken.getAddress(), treasury.address, owner.address);

        raacToken.setFeeCollector(await feeCollector.getAddress());

        MockStabilityPool = await ethers.getContractFactory("MockStabilityPool");
        stabilityPool = await MockStabilityPool.deploy(await raacToken.getAddress());

        await stabilityPool.mockGetTotalDeposits(ethers.parseEther("500000"));

        RAACMinter = await ethers.getContractFactory("RAACMinter");
        raacMinter = await RAACMinter.deploy(await raacToken.getAddress(), await stabilityPool.getAddress(), await lendingPool.getAddress(), owner.address);
  
        await raacToken.setMinter(await raacMinter.getAddress());

        await raacToken.addToWhitelist(await feeCollector.getAddress());
        await raacToken.addToWhitelist(await stabilityPool.getAddress());

        expect(await raacToken.whitelistAddress(await feeCollector.getAddress())).to.be.true;
        expect(await raacToken.whitelistAddress(await stabilityPool.getAddress())).to.be.true;
        expect(await raacToken.whitelistAddress(user1.address)).to.be.false;
        expect(await raacToken.whitelistAddress(user2.address)).to.be.false;
        expect(await raacToken.whitelistAddress(treasury.address)).to.be.false;

        await raacMinter.connect(owner).tick();
    });
  
    describe("Fee Collection", function () {
        it("should collect swap fees on transfers", async function () {
            const initialMintedBalance = await raacToken.balanceOf(stabilityPool.target);
            const transferAmount = ethers.parseEther("0.1");
            
            let balances = {
                stabilityPool: await raacToken.balanceOf(stabilityPool.target),
                ownerBalance: await raacToken.balanceOf(owner.address),
                feeCollector: await raacToken.balanceOf(feeCollector.target),
                user1Balance: await raacToken.balanceOf(user1.address)
            }
            expect(balances.stabilityPool).to.equal(initialMintedBalance);

            await stabilityPool.transfer(owner.address, transferAmount);

            balances = {
                stabilityPool: await raacToken.balanceOf(stabilityPool.target),
                ownerBalance: await raacToken.balanceOf(owner.address),
                feeCollector: await raacToken.balanceOf(feeCollector.target),
                user1Balance: await raacToken.balanceOf(user1.address)
            }
            expect(balances.stabilityPool).to.equal(initialMintedBalance - transferAmount);
            expect(balances.ownerBalance).to.equal(transferAmount);
            expect(balances.feeCollector).to.equal(0);

            await raacToken.connect(owner).transfer(user1.address, transferAmount);

            balances = {
                stabilityPool: await raacToken.balanceOf(stabilityPool.target),
                ownerBalance: await raacToken.balanceOf(owner.address),
                feeCollector: await raacToken.balanceOf(feeCollector.target),
                user1Balance: await raacToken.balanceOf(user1.address)
            }
            const expectedFee = (transferAmount * BigInt(100)) / BigInt(10000);
            expect(balances.stabilityPool).to.equal(initialMintedBalance - transferAmount);
            expect(balances.ownerBalance).to.equal(0);
            expect(balances.feeCollector).to.equal(expectedFee);
            expect(balances.user1Balance).to.equal(transferAmount - expectedFee);

            const user1Balance = await raacToken.balanceOf(user1.address);
            const expectedUser1Balance = ethers.parseEther("0.099");
            expect(user1Balance).to.equal(expectedUser1Balance);

            const stabilityPoolBalance = await raacToken.balanceOf(stabilityPool.target);
            const expectedStabilityPoolBalance = initialMintedBalance - transferAmount;
            expect(stabilityPoolBalance).to.equal(expectedStabilityPoolBalance);
        });
  
        it("should collect burn fees on token burns", async function () {
            const initialMintedBalance = await raacToken.balanceOf(stabilityPool.target);
            const burnAmount = ethers.parseEther("0.1");
       
            await stabilityPool.transfer(user1.address, initialMintedBalance);
            expect(await raacToken.balanceOf(user1.address)).to.equal(initialMintedBalance);

            await raacToken.connect(user1).burn(burnAmount);
  
            const expectedFee = burnAmount * BigInt(5) / BigInt(1000);
            const feeCollectorBalance = await raacToken.balanceOf(feeCollector.target);
        
            expect(feeCollectorBalance).to.equal(expectedFee);
        });

        it("should collect fees when fee collector is set", async function () {
            const maxBalance = await raacToken.balanceOf(stabilityPool.target);
            await stabilityPool.transfer(owner.address, maxBalance);

            const transferAmount = ethers.parseEther("0.1");
            const initialBalance = await raacToken.balanceOf(owner.address);
        
            await raacToken.connect(owner).transfer(user1.address, transferAmount);
        
            const expectedFee = transferAmount * BigInt(100) / BigInt(10000);
            const finalBalance = await raacToken.balanceOf(user1.address);
            expect(finalBalance).to.equal(transferAmount - expectedFee);
        
            const ownerFinalBalance = await raacToken.balanceOf(owner.address);
            expect(ownerFinalBalance).to.equal(initialBalance - transferAmount);
        
            const feeCollectorBalance = await raacToken.balanceOf(feeCollector.target);
            expect(feeCollectorBalance).to.equal(expectedFee);
        });
    });
  
    describe("Fee Rate Management", function () {
        it("should allow owner to update swap tax rate", async function () {
            const maxBalance = await raacToken.balanceOf(stabilityPool.target);
            await stabilityPool.transfer(owner.address, maxBalance);
            const newSwapTaxRate = 110;
            await raacToken.connect(owner).setSwapTaxRate(newSwapTaxRate);
            expect(await raacToken.swapTaxRate()).to.equal(newSwapTaxRate);
  
            const transferAmount = ethers.parseEther("0.1");
            await raacToken.connect(owner).transfer(user1.address, transferAmount);
  
            const expectedFee = transferAmount * BigInt(newSwapTaxRate) / BigInt(10000);
            const feeCollectorBalance = await raacToken.balanceOf(feeCollector.target);
        
            expect(feeCollectorBalance).to.equal(expectedFee);
        });
  
        it("should allow owner to update burn tax rate", async function () {
            const maxBalance = await raacToken.balanceOf(stabilityPool.target);
            await stabilityPool.transfer(user1.address, maxBalance);
        
            const newBurnTaxRate = 55;
            await raacToken.connect(owner).setBurnTaxRate(newBurnTaxRate);
            expect(await raacToken.burnTaxRate()).to.equal(newBurnTaxRate);
  
            const burnAmount = ethers.parseEther("0.1");
            await raacToken.connect(user1).burn(burnAmount);
  
            const expectedFee = burnAmount * BigInt(newBurnTaxRate) / BigInt(10000);
            const feeCollectorBalance = await raacToken.balanceOf(feeCollector.target);
        
            expect(feeCollectorBalance).to.equal(expectedFee);
        });
  
        it("should not allow non-owner to update tax rates", async function () {
            await expect(raacToken.connect(user1).setSwapTaxRate(20)).to.be.revertedWithCustomError(raacToken, "OwnableUnauthorizedAccount");
            await expect(raacToken.connect(user1).setBurnTaxRate(10)).to.be.revertedWithCustomError(raacToken, "OwnableUnauthorizedAccount");
        });
  
        it("should not allow tax rates to exceed 10%", async function () {
            await raacToken.connect(owner).setTaxRateIncrementLimit(1000);
            let currentRate = await raacToken.swapTaxRate();
            const targetRate = 999;
            const incrementStep = 10;

            while (currentRate < targetRate) {
                let newRate = parseInt(currentRate) + Math.floor(parseInt(currentRate) * incrementStep / 100);
                if(newRate > targetRate) {
                    newRate = targetRate;
                }
                await raacToken.connect(owner).setSwapTaxRate(newRate);
                currentRate = await raacToken.swapTaxRate();
            }

            const maxRate = await raacToken.swapTaxRate();
            expect(maxRate).to.equal(999);

            await expect(raacToken.connect(owner).setSwapTaxRate(1001)).to.be.revertedWithCustomError(raacToken, "TaxRateExceedsLimit");
            await expect(raacToken.connect(owner).setBurnTaxRate(1001)).to.be.revertedWithCustomError(raacToken, "TaxRateExceedsLimit");
        });
  
        it("should not allow tax rate changes exceeding 10% per update", async function () {
            const initialSwapTaxRate = await raacToken.swapTaxRate();
            expect(initialSwapTaxRate).to.equal(100);
            const initialBurnTaxRate = await raacToken.burnTaxRate();
            expect(initialBurnTaxRate).to.equal(50);

            await expect(raacToken.connect(owner).setSwapTaxRate(111)).to.be.revertedWithCustomError(raacToken, "TaxRateChangeExceedsAllowedIncrement");
            await expect(raacToken.connect(owner).setBurnTaxRate(56)).to.be.revertedWithCustomError(raacToken, "TaxRateChangeExceedsAllowedIncrement");
      
            await raacToken.connect(owner).setSwapTaxRate(110);
            expect(await raacToken.swapTaxRate()).to.equal(110);
            await raacToken.connect(owner).setBurnTaxRate(55);
            expect(await raacToken.burnTaxRate()).to.equal(55);
        });
    });
  
    describe("FeeCollector Management", function () {
    });

    describe("FeeCollector Removal", function () {
        it("should allow owner to remove fee collector and perform tax-free transfers", async function () {
            await raacToken.connect(owner).setFeeCollector(ethers.ZeroAddress);
            const initialMintedBalance = await raacToken.balanceOf(stabilityPool.target);
            await stabilityPool.transfer(user1.address, initialMintedBalance);

            const transferAmount = initialMintedBalance;
            await raacToken.connect(user1).transfer(user2.address, transferAmount);

            const user2Balance = await raacToken.balanceOf(user2.address);
            expect(user2Balance).to.equal(transferAmount);
      
            const user1Balance = await raacToken.balanceOf(user1.address);
            expect(user1Balance).to.equal(0);
      
            const feeCollectorBalance = await raacToken.balanceOf(feeCollector.target);
            expect(feeCollectorBalance).to.equal(0);
        });
    });
});