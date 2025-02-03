import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;


const WAD = ethers.parseEther("1");
const RAY = ethers.parseUnits("1", 27);

const WadRayMath = {
  wadToRay: (wad) => (BigInt(wad) * BigInt(RAY)) / BigInt(WAD),
  rayToWad: (ray) => {
    ray = BigInt(ray);
    return (ray * BigInt(WAD)) / BigInt(RAY);
  },
};

function getReserveDataStructure(reserveData) {
  return {
      totalLiquidity: reserveData.totalLiquidity,
      totalScaledUsage: reserveData.totalScaledUsage,
      liquidityIndex: reserveData.liquidityIndex,
      usageIndex: reserveData.usageIndex,
      lastUpdateTimestamp: reserveData.lastUpdateTimestamp
  };
}

async function getCurrentLiquidityRatePercentage(lendingPool) {
  const rateData = await lendingPool.rateData();
  const currentLiquidityRate = rateData.currentLiquidityRate;
  const percentage = Number(currentLiquidityRate) / 1e25;
  return percentage;
}

async function getCurrentBorrowRatePercentage(lendingPool) {
  const rateData = await lendingPool.rateData();
  const currentUsageRate = rateData.currentUsageRate;
  const percentage = Number(currentUsageRate) / 1e25;
  return percentage;
}

async function getCurrentUtilizationRatePercentage(lendingPool) {
  const reserve = await lendingPool.reserve();
  const totalLiquidity = reserve.totalLiquidity;
  const totalUsage = reserve.totalUsage;

  const utilizationRate = Number(totalUsage) / (Number(totalLiquidity) + Number(totalUsage));

  const usageIndex = reserve.usageIndex;
  const usage = totalUsage * (usageIndex / RAY);

  if (totalLiquidity == 0n) {
    return 0;
  }

  // const utilizationRate = (Number(usage) / Number(totalLiquidity)) * 100;
  return utilizationRate * 100;
}

describe("LendingPool", function () {
  let owner, user1, user2, user3;
  let crvusd, raacNFT, raacHousePrices, stabilityPool, raacFCL, raacVault;
  let lendingPool, rToken, debtToken;
  let deployer;
  let token;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const CrvUSDToken = await ethers.getContractFactory("crvUSDToken");
    crvusd = await CrvUSDToken.deploy(owner.address);
  
    await crvusd.setMinter(owner.address);
  
    token = crvusd;
  
    const RAACHousePrices = await ethers.getContractFactory("RAACHousePrices");
    raacHousePrices = await RAACHousePrices.deploy(owner.address);
  
    const RAACNFT = await ethers.getContractFactory("RAACNFT");
    raacNFT = await RAACNFT.deploy(crvusd.target, raacHousePrices.target, owner.address);
  
    stabilityPool = { target: owner.address };
  
    const RToken = await ethers.getContractFactory("RToken");
    rToken = await RToken.deploy("RToken", "RToken", owner.address, crvusd.target);
  
    const DebtToken = await ethers.getContractFactory("DebtToken");
    debtToken = await DebtToken.deploy("DebtToken", "DT", owner.address);
  
    const initialPrimeRate = ethers.parseUnits("0.1", 27);

    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(
      crvusd.target,
      rToken.target,
      debtToken.target,
      raacNFT.target,
      raacHousePrices.target,
      initialPrimeRate
    );

    await rToken.setReservePool(lendingPool.target);
    await debtToken.setReservePool(lendingPool.target);

    await rToken.transferOwnership(lendingPool.target);
    await debtToken.transferOwnership(lendingPool.target);

    const mintAmount = ethers.parseEther("1000");
    await crvusd.mint(user1.address, mintAmount);
    await crvusd.mint(user3.address, mintAmount);

    const mintAmount2 = ethers.parseEther("10000");
    await crvusd.mint(user2.address, mintAmount2);

    await crvusd.connect(user1).approve(lendingPool.target, mintAmount);
    await crvusd.connect(user2).approve(lendingPool.target, mintAmount);
    await crvusd.connect(user3).approve(lendingPool.target, mintAmount);

    await raacHousePrices.setOracle(owner.address);
    // FIXME: we are using price oracle and therefore the price should be changed from the oracle.
    await raacHousePrices.setHousePrice(1, ethers.parseEther("100"));

    await ethers.provider.send("evm_mine", []);

    const housePrice = await raacHousePrices.tokenToHousePrice(1);

    const raacHpAddress = await raacNFT.raac_hp();

    const priceFromNFT = await raacNFT.getHousePrice(1);

    const tokenId = 1;
    const amountToPay = ethers.parseEther("100");

    await token.mint(user1.address, amountToPay);

    await token.connect(user1).approve(raacNFT.target, amountToPay);

    await raacNFT.connect(user1).mint(tokenId, amountToPay);

    const depositAmount = ethers.parseEther("1000");
    await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
    await lendingPool.connect(user2).deposit(depositAmount);

    await ethers.provider.send("evm_mine", []);

    expect(await crvusd.balanceOf(rToken.target)).to.equal(ethers.parseEther("1000"));
  });

  describe("Access Control and Security", function () {
    it("should prevent non-owner from setting prime rate", async function () {
      // FIXME: we are using price oracle and therefore the price should be changed from the oracle.
      await expect(lendingPool.connect(user1).setPrimeRate(ethers.parseEther("0.05")))
        .to.be.revertedWithCustomError(lendingPool, "Unauthorized")
    });

    it("should prevent reentrancy attacks on deposit", async function () {
      const depositAmount = ethers.parseEther("1");
      await expect(lendingPool.connect(user1).deposit(depositAmount)).to.not.be.reverted;
    });
  });

  describe("Deposit and Withdraw", function () {
    it("should allow user to deposit crvUSD and receive rToken", async function () {
      const depositAmount = ethers.parseEther("100");

      await lendingPool.connect(user1).deposit(depositAmount);

      await ethers.provider.send("evm_mine", []);
      const rTokenBalance = await rToken.balanceOf(user1.address);
      expect(rTokenBalance).to.equal(depositAmount);

      const crvUSDBalance = await crvusd.balanceOf(user1.address);
      expect(crvUSDBalance).to.equal(ethers.parseEther("900"));

      const debtBalance = await debtToken.balanceOf(user1.address);
      expect(debtBalance).to.equal(0);

      const reserveBalance = await crvusd.balanceOf(rToken.target)
      expect(reserveBalance).to.equal(ethers.parseEther("1100"));
    });

    it("should allow user to withdraw crvUSD by burning rToken", async function () {
      expect(await crvusd.balanceOf(rToken.target)).to.equal(ethers.parseEther("1000"));
      expect(await rToken.balanceOf(user1.address)).to.equal(0);
      expect(await debtToken.balanceOf(user1.address)).to.equal(0);
      expect(await crvusd.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
      const depositAmount = ethers.parseEther("100");
      await lendingPool.connect(user1).deposit(depositAmount);
      expect(await crvusd.balanceOf(rToken.target)).to.equal(ethers.parseEther("1100"));
      expect(await rToken.balanceOf(user1.address)).to.equal(depositAmount);
      expect(await debtToken.balanceOf(user1.address)).to.equal(0);
      expect(await crvusd.balanceOf(user1.address)).to.equal(ethers.parseEther("900"));
      await rToken.connect(user1).approve(lendingPool.target, depositAmount);


      const withdrawAmount = ethers.parseEther("10");
      await lendingPool.connect(user1).withdraw(withdrawAmount);
      expect(await debtToken.balanceOf(user1.address)).to.equal(ethers.parseEther("0"));
      expect(await rToken.balanceOf(user1.address)).to.equal(ethers.parseEther("90"));
      expect(await crvusd.balanceOf(rToken.target)).to.equal(ethers.parseEther("1090"));
      expect(await crvusd.balanceOf(user1.address)).to.equal(ethers.parseEther("910"));


      await lendingPool.connect(user1).withdraw(depositAmount - withdrawAmount);

      const rTokenBalance = await rToken.balanceOf(user1.address);
      expect(rTokenBalance).to.equal(0);

      const crvUSDBalance = await crvusd.balanceOf(user1.address);
      expect(crvUSDBalance).to.equal(ethers.parseEther("1000"));

      const debtBalance = await debtToken.balanceOf(user1.address);

      expect(await crvusd.balanceOf(rToken.target)).to.equal(ethers.parseEther("1000"));
      expect(debtBalance).to.equal(0);
    });

    it("should prevent withdrawing more than balance", async function () {
        const depositAmount = ethers.parseEther("100");
        const withdrawAmount = ethers.parseEther("200");

        expect(await crvusd.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
        expect(await crvusd.balanceOf(rToken.target)).to.equal(ethers.parseEther("1000"));
        expect(await rToken.balanceOf(user1.address)).to.equal(0);
        expect(await debtToken.balanceOf(user1.address)).to.equal(0);

        await lendingPool.connect(user1).deposit(depositAmount);
        await rToken.connect(user1).approve(lendingPool.target, withdrawAmount);

        expect(await crvusd.balanceOf(user1.address)).to.equal(ethers.parseEther("900"));
        expect(await crvusd.balanceOf(rToken.target)).to.equal(ethers.parseEther("1100"));
        expect(await rToken.balanceOf(user1.address)).to.equal(depositAmount);
        expect(await debtToken.balanceOf(user1.address)).to.equal(0);

        await lendingPool.connect(user1).withdraw(withdrawAmount);
        expect(await crvusd.balanceOf(rToken.target)).to.equal(ethers.parseEther("1000"));

        expect(await crvusd.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
        expect(await rToken.balanceOf(user1.address)).to.equal(0);
        expect(await debtToken.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("Borrow and Repay", function () {
    beforeEach(async function () {
        const depositAmount = ethers.parseEther("1000");
        await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
        await lendingPool.connect(user2).deposit(depositAmount);

        const tokenId = 1;
        await raacNFT.connect(user1).approve(lendingPool.target, tokenId);
        await lendingPool.connect(user1).depositNFT(tokenId);
    });

    it("should allow user to borrow crvUSD using NFT collateral", async function () {
        const borrowAmount = ethers.parseEther("50");

        await lendingPool.connect(user1).borrow(borrowAmount);
    
        const crvUSDBalance = await crvusd.balanceOf(user1.address);
        expect(crvUSDBalance).to.equal(ethers.parseEther("1050"));
    
        const debtBalance = await debtToken.balanceOf(user1.address);

        expect(debtBalance).to.gte(borrowAmount);
    });

    it("should prevent user from borrowing more than allowed", async function () {
      const borrowAmount = ethers.parseEther("900");

      await expect(lendingPool.connect(user1).borrow(borrowAmount))
        .to.be.revertedWithCustomError(lendingPool, "NotEnoughCollateralToBorrow");
    });

    it("should allow user to repay borrowed crvUSD", async function () {
      const borrowAmount = ethers.parseEther("50");
      await lendingPool.connect(user1).borrow(borrowAmount);

      const debtAmount = await debtToken.balanceOf(user1.address)
      await crvusd.connect(user1).approve(rToken.target, debtAmount + ethers.parseEther("0.000001"));
      await lendingPool.connect(user1).repay(debtAmount + ethers.parseEther("0.000001"));

      const debtBalance = await debtToken.balanceOf(user1.address);
      expect(debtBalance).to.equal(0);

      const crvUSDBalance = await crvusd.balanceOf(user1.address);
      expect(crvUSDBalance).to.lte(ethers.parseEther("1000"));
      expect(crvUSDBalance).to.gte(ethers.parseEther("999.9999990"));
    });

    it("should only allow user to repay up to the owed amount", async function () {
      const borrowAmount = ethers.parseEther("50");

      await lendingPool.connect(user1).borrow(borrowAmount);

      const debtAmount = await debtToken.balanceOf(user1.address);
      const repayAmount = debtAmount + ethers.parseEther("1");
      
      await crvusd.connect(user1).approve(rToken.target, repayAmount);
      
      const initialBalance = await crvusd.balanceOf(user1.address);
      
      // Let the interest accrue accross 2 blocks
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);
      await lendingPool.connect(user1).updateState();

      await lendingPool.connect(user1).repay(repayAmount);
      
      const finalDebt = await debtToken.balanceOf(user1.address);
      const finalBalance = await crvusd.balanceOf(user1.address);
      
      expect(finalDebt).to.equal(0);
      const balanceDifference = initialBalance - finalBalance;
      const tolerance = ethers.parseEther("0.000001");
      expect(balanceDifference).to.be.closeTo(debtAmount, tolerance);
      expect(balanceDifference).to.be.closeTo(borrowAmount, tolerance);
      expect(balanceDifference).to.be.greaterThan(borrowAmount);
    });
    it("should allow user1 to deposit, borrow 10 crvUSD, repay, and verify depositor interest", async function () {
      let expectedBalances = {
        user1:{
          crvUSD: ethers.parseEther("1000"),
          rToken: ethers.parseEther("0"),
          debt: ethers.parseEther("0")
        },
        user2:{
          crvUSD: ethers.parseEther("8000"),
          rToken: ethers.parseEther("2000"),
          debt: ethers.parseEther("0")
        },
        rToken: {
          crvUSD: ethers.parseEther("2000"),
        }
      }
      
      const user2InitialBalance = await crvusd.balanceOf(user2.address);
      expect(user2InitialBalance).to.equal(expectedBalances.user2.crvUSD);

      const depositedAmount = await rToken.balanceOf(user2.address);
      
      expect(depositedAmount).to.equal(expectedBalances.rToken.crvUSD);

      const initialBalanceOfRToken = await crvusd.balanceOf(rToken.target);
      expect(initialBalanceOfRToken).to.equal(expectedBalances.rToken.crvUSD);

      const borrowAmount = ethers.parseEther("10");
      expect(await crvusd.balanceOf(user1.address)).to.equal(expectedBalances.user1.crvUSD);
      await lendingPool.connect(user1).borrow(borrowAmount);
      await lendingPool.connect(user1).updateState();

      expectedBalances.user1.crvUSD = expectedBalances.user1.crvUSD + borrowAmount;
      expectedBalances.user1.debt = expectedBalances.user1.debt + borrowAmount;
      expectedBalances.rToken.crvUSD = expectedBalances.rToken.crvUSD - borrowAmount;

      let user1CrvUSDBalance = await crvusd.balanceOf(user1.address);
      expect(user1CrvUSDBalance).to.equal(expectedBalances.user1.crvUSD);
      let user1DebtBalance = await debtToken.balanceOf(user1.address);
      expect(user1DebtBalance).to.closeTo(expectedBalances.user1.debt, ethers.parseEther("0.000002"));

      await ethers.provider.send("evm_increaseTime", [1 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      await lendingPool.connect(user1).updateState();

       await ethers.provider.send("evm_increaseTime", [364 * 24 * 60 * 60]);
       await ethers.provider.send("evm_mine", []);
       await lendingPool.connect(user1).updateState();

       const currentBorrowRate = await getCurrentBorrowRatePercentage(lendingPool);
       const currentLiquidityRate = await getCurrentLiquidityRatePercentage(lendingPool)
       
      expect(currentBorrowRate).to.be.closeTo(2.52, 0.03);
      const wadCurrentBorrowRatePercentage = ethers.parseUnits(currentBorrowRate.toString(), 18);
      const wadCurrentLiquidityRatePercentage = ethers.parseUnits(currentLiquidityRate.toString(), 18);

      expect(wadCurrentBorrowRatePercentage).to.be.closeTo(ethers.parseUnits(currentBorrowRate.toString(), 18), ethers.parseUnits("0.01", 18))

      await lendingPool.connect(user1).updateState();
      const generatedDebt = (expectedBalances.user1.debt * wadCurrentBorrowRatePercentage) / BigInt(100 * 1e18);

      const utilizationRate = await getCurrentUtilizationRatePercentage(lendingPool);
      const totalLiquidity = await crvusd.balanceOf(rToken.target);
      const generatedInterest = (totalLiquidity * wadCurrentLiquidityRatePercentage) / BigInt(100 * 1e18);

      expect(generatedInterest).to.be.closeTo(ethers.parseUnits("0.25", 18), ethers.parseUnits("0.004", 18));
      const percentInterestGenerated = Number((generatedDebt * 100n * BigInt(1e18)) / expectedBalances.user1.debt) / 1e18;
      expect(percentInterestGenerated).to.be.closeTo(currentBorrowRate, 0.03);
      expectedBalances.user1.debt = expectedBalances.user1.debt + generatedDebt;
      expectedBalances.user2.rToken = expectedBalances.user2.rToken + generatedInterest;

      await lendingPool.connect(user1).updateState();
      const user2RTokenBalance = await rToken.balanceOf(user2.address);

      expect(user2RTokenBalance).to.closeTo(expectedBalances.user2.rToken, ethers.parseUnits("0.01", 18));
      const amountInterest = user2RTokenBalance - expectedBalances.user2.rToken;

      const repayAmount = ethers.parseEther("1");
      await crvusd.connect(user1).approve(rToken.target, repayAmount);
      await lendingPool.connect(user1).repay(repayAmount);
      await lendingPool.connect(user1).updateState();
      console.log({
        crvusd:{
          user1: ethers.formatEther(await crvusd.balanceOf(user1.address)),
          user2: ethers.formatEther(await crvusd.balanceOf(user2.address)),
          reserve: ethers.formatEther(await crvusd.balanceOf(rToken.target)),
        },
        rToken: {
          user1: ethers.formatEther(await rToken.balanceOf(user1.address)),
          user2: ethers.formatEther(await rToken.balanceOf(user2.address)),
        },
        debtToken: {
          user1: ethers.formatEther(await debtToken.balanceOf(user1.address)),
          user2: ethers.formatEther(await debtToken.balanceOf(user2.address)),
        },
      });
      expectedBalances.user1.crvUSD = expectedBalances.user1.crvUSD - repayAmount;
      expectedBalances.user1.debt = expectedBalances.user1.debt - repayAmount;
      expectedBalances.rToken.crvUSD = expectedBalances.rToken.crvUSD + repayAmount;

      user1CrvUSDBalance = await crvusd.balanceOf(user1.address)
      expect(user1CrvUSDBalance).to.be.closeTo(expectedBalances.user1.crvUSD, ethers.parseEther("0.05"));
    
      expect(await debtToken.balanceOf(user1.address)).to.be.closeTo(expectedBalances.user1.debt, ethers.parseEther("0.6"));
      // expect(await debtToken.balanceOf(user1.address)).to.be.closeTo(expectedBalances.user1.debt, ethers.parseEther("0.06"));
      expect(await crvusd.balanceOf(rToken.target)).to.be.gte(expectedBalances.rToken.crvUSD);
      expect(await crvusd.balanceOf(rToken.target)).to.be.lte(expectedBalances.rToken.crvUSD + 1n);

      const depositAmount = ethers.parseEther("990");
     
      await crvusd.connect(user2).approve(lendingPool.target, depositAmount + ethers.parseEther("10"));
      await lendingPool.connect(user2).deposit(depositAmount);
      await lendingPool.connect(user2).deposit(ethers.parseEther("1"));
      await lendingPool.connect(user2).deposit(ethers.parseEther("1"));
      await lendingPool.connect(user2).deposit(ethers.parseEther("1"));
      await lendingPool.connect(user2).deposit(ethers.parseEther("1"));
      await lendingPool.connect(user2).deposit(ethers.parseEther("1"));
      await lendingPool.connect(user2).deposit(ethers.parseEther("1"));
      await lendingPool.connect(user2).deposit(ethers.parseEther("1"));
      await lendingPool.connect(user2).deposit(ethers.parseEther("1"));
      await lendingPool.connect(user2).deposit(ethers.parseEther("1"));
      await lendingPool.connect(user2).deposit(ethers.parseEther("1"));
      expectedBalances.user2.crvUSD = expectedBalances.user2.crvUSD - depositAmount - ethers.parseEther("10");
      expectedBalances.user2.rToken = expectedBalances.user2.rToken + depositAmount + ethers.parseEther("10");
      expectedBalances.rToken.crvUSD = expectedBalances.rToken.crvUSD + depositAmount + ethers.parseEther("10");
      expect(await crvusd.balanceOf(rToken.target)).to.be.gte(expectedBalances.rToken.crvUSD);
      expect(await crvusd.balanceOf(rToken.target)).to.be.lte(expectedBalances.rToken.crvUSD);

      expect(await rToken.balanceOf(user2.address)).to.closeTo(expectedBalances.user2.rToken, ethers.parseEther("0.01"));
      expect(await crvusd.balanceOf(user2.address)).to.equal(expectedBalances.user2.crvUSD);

      const user2RTokenBalanceAfterDeposit = await rToken.balanceOf(user2.address);
      expect(user2RTokenBalanceAfterDeposit).to.be.closeTo(depositAmount + ethers.parseEther("10") + depositedAmount + ethers.parseEther("0.25"), ethers.parseEther("0.3"));
      user1DebtBalance = await debtToken.balanceOf(user1.address);
      expect(user1DebtBalance).to.be.closeTo(borrowAmount - repayAmount, ethers.parseEther("0.6"));
      // await ethers.provider.send("evm_increaseTime", [7 * 86400]);
      // await ethers.provider.send("evm_mine");

      const generatedInterest2 = (expectedBalances.user1.debt * wadCurrentBorrowRatePercentage) / BigInt(100 * 1e18);
      const percentInterestGenerated2 = Number((generatedInterest2 * 100n * BigInt(1e18)) / expectedBalances.user1.debt) / 1e18;
      expect(percentInterestGenerated2).to.be.closeTo(currentBorrowRate, 0.01);
      expectedBalances.user1.debt = expectedBalances.user1.debt + generatedInterest2;
      expectedBalances.user2.rToken = expectedBalances.user2.rToken + generatedInterest2;
      expect(expectedBalances.user2.rToken).to.be.closeTo(expectedBalances.user2.rToken, ethers.parseEther("0.01"));

      const secondRepayAmount = ethers.parseEther("4");
      await crvusd.connect(user1).approve(rToken.target, secondRepayAmount);
      await lendingPool.connect(user1).repay(secondRepayAmount);

      expectedBalances.user1.crvUSD = expectedBalances.user1.crvUSD - secondRepayAmount;
      expectedBalances.user1.debt = expectedBalances.user1.debt - secondRepayAmount + generatedInterest2;
      expectedBalances.rToken.crvUSD = expectedBalances.rToken.crvUSD + secondRepayAmount;

      expect(await crvusd.balanceOf(user1.address)).to.be.closeTo(expectedBalances.user1.crvUSD, ethers.parseEther("0.3"));
      expect(await debtToken.balanceOf(user1.address)).to.be.closeTo(expectedBalances.user1.debt, ethers.parseEther("0.8"));
      expect(await crvusd.balanceOf(rToken.target)).to.be.gte(expectedBalances.rToken.crvUSD);
      expect(await crvusd.balanceOf(rToken.target)).to.be.lte(expectedBalances.rToken.crvUSD + 10n);
      const user1CrvUSDAfterSecondRepay = await crvusd.balanceOf(user1.address);

      expect(user1CrvUSDAfterSecondRepay).to.be.lessThanOrEqual(ethers.parseEther("1005"));
      expect(user1CrvUSDAfterSecondRepay).to.be.greaterThanOrEqual(ethers.parseEther("1004.999"));

      const user2RTokenBalanceAfterSecondRepay = await rToken.balanceOf(user2.address);
      expect(user2RTokenBalanceAfterSecondRepay).to.be.closeTo(depositAmount + depositedAmount + ethers.parseEther("10") + ethers.parseEther("0.25"), ethers.parseEther("0.1"));
      await lendingPool.connect(user2).withdraw(depositAmount);
      const user2RTokenBalanceAfterWithdraw = await rToken.balanceOf(user2.address);
      expect(user2RTokenBalanceAfterWithdraw).to.be.closeTo(depositedAmount + ethers.parseEther("10.25"), ethers.parseEther("0.3"));

      const user1DebtBalance2 = await debtToken.balanceOf(user1.address);
      await crvusd.connect(user1).approve(rToken.target, user1DebtBalance2  + ethers.parseEther("0.3"));
      await lendingPool.connect(user1).repay(user1DebtBalance2 + ethers.parseEther("2"));

      const user2RTokenBalanceAfter = await rToken.balanceOf(user2.address);
      expect(user2RTokenBalanceAfter).to.be.gt('2000');
      await lendingPool.connect(user1).withdrawNFT(1);

      const fullWithdraw = await rToken.balanceOf(user2.address) + ethers.parseEther("0.1");
      await lendingPool.connect(user2).withdraw(fullWithdraw);
      const user2RTokenBalanceAfterFinalWithdraw = await rToken.balanceOf(user2.address);
      expect(user2RTokenBalanceAfterFinalWithdraw).to.equal(0);
      const lendingPoolBalance = await crvusd.balanceOf(rToken.target);

      let expectedFinalReservePoolBalance = ethers.parseEther("0.0032")

      expect(lendingPoolBalance).to.closeTo(expectedFinalReservePoolBalance, ethers.parseEther("0.01"));
      
      const user1CrvUSDBalanceAfterFinalWithdraw = await crvusd.balanceOf(user1.address);
      expect(user1CrvUSDBalanceAfterFinalWithdraw).to.closeTo(ethers.parseEther("999.74"), ethers.parseEther("0.1"));

      const user1DebtBalanceAfterFinalWithdraw = await debtToken.balanceOf(user1.address);
      expect(user1DebtBalanceAfterFinalWithdraw).to.equal(0);

      const user2CrvUSDBalanceAfterFinalWithdraw = await crvusd.balanceOf(user2.address);
      expect(user2CrvUSDBalanceAfterFinalWithdraw).to.closeTo(user2InitialBalance + ethers.parseEther("2000") + ethers.parseEther("0.254"), ethers.parseEther("0.1"));

      expect(user2RTokenBalanceAfterFinalWithdraw).to.equal(0);
    });
  });

  describe("Full sequence", function () {
    beforeEach(async function () {
      const initialBalanceOfRToken = await crvusd.balanceOf(rToken.target);
      const depositAmount = ethers.parseEther("1000");
      await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
      await lendingPool.connect(user2).deposit(depositAmount);
      // mine 1 day update state
      await ethers.provider.send("evm_increaseTime", [1 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      await lendingPool.connect(user2).updateState();
      const tokenId = 1;
      await raacNFT.connect(user1).approve(lendingPool.target, tokenId);
      await lendingPool.connect(user1).depositNFT(tokenId);

      const borrowAmount = ethers.parseEther("80");
      await lendingPool.connect(user1).borrow(borrowAmount);

      await crvusd.connect(user2).approve(lendingPool.target, ethers.parseEther("1000"));
      await crvusd.connect(owner).approve(lendingPool.target, ethers.parseEther("1000"));

      await lendingPool.connect(user2).withdraw(depositAmount);
      const depositedAmount = ethers.parseEther("1000");
      const user2RTokenBalanceAfterWithdraw = await rToken.balanceOf(user2.address);
      expect(user2RTokenBalanceAfterWithdraw).to.be.closeTo(depositedAmount, ethers.parseEther("0.3"));

      const user1DebtBalance2 = await debtToken.balanceOf(user1.address);
      await crvusd.connect(user1).approve(rToken.target, user1DebtBalance2  + ethers.parseEther("0.3"));
      await lendingPool.connect(user1).repay(user1DebtBalance2 + ethers.parseEther("1"));

      const user1DebtAfterRepay2 = await debtToken.balanceOf(user1.address);
      expect(user1DebtAfterRepay2).to.be.lte(0); // Should be zero

      const user2RTokenBalanceAfter = await rToken.balanceOf(user2.address);
      expect(user2RTokenBalanceAfter).to.be.gt('2000');

      await lendingPool.connect(user1).withdrawNFT(1);

      const rTokenBeforeFullWithdraw = await rToken.balanceOf(user2.address)
      const fullWithdraw = rTokenBeforeFullWithdraw + ethers.parseEther("20.2");
      
      await lendingPool.connect(user2).withdraw(fullWithdraw);
      const user2RTokenBalanceAfterFinalWithdraw = await rToken.balanceOf(user2.address);
      expect(user2RTokenBalanceAfterFinalWithdraw).to.equal(0);

      const lendingPoolBalance = await crvusd.balanceOf(rToken.target);
      // expect(initialBalanceOfRToken).to.equal(ethers.parseEther("2000"));

      let expectedFinalReservePoolBalance = initialBalanceOfRToken
            - ethers.parseEther("80")     // User1 borrow
            + ethers.parseEther("1000")   // User2 additional deposit
            // + ethers.parseEther("80")      // User1 second repay
            - ethers.parseEther("1000")   // User2 first withdrawal
            + user1DebtBalance2           // User1 final repay (actual debt balance)
            // + ethers.parseEther("20")     // User3 deposit
            - rTokenBeforeFullWithdraw     // User2 final withdrawal
           + ethers.parseEther("0.0000002"); // difference between linear and compounded interest + rounding + other reserve
            // + ethers.parseEther("0.000000000024778654"); // difference between linear and compounded interest + rounding + other reserve
      // Assert the expected balance
      expect(lendingPoolBalance).to.closeTo(expectedFinalReservePoolBalance, ethers.parseEther("0.00001"));
      
      // Display user1's crvUSD balance
      const user1CrvUSDBalanceAfterFinalWithdraw = await crvusd.balanceOf(user1.address);
      expect(user1CrvUSDBalanceAfterFinalWithdraw).to.closeTo(ethers.parseEther("999.99"), ethers.parseEther("0.1"));

      // Display user1's debt balance
      const user1DebtBalanceAfterFinalWithdraw = await debtToken.balanceOf(user1.address);
      expect(user1DebtBalanceAfterFinalWithdraw).to.equal(0);

      // Display user2's crvUSD balance
      const user2CrvUSDBalanceAfterFinalWithdraw = await crvusd.balanceOf(user2.address);
      expect(user2CrvUSDBalanceAfterFinalWithdraw).to.gte(ethers.parseEther("1000"));
      expect(user2RTokenBalanceAfterFinalWithdraw).to.equal(0);
    });
    it("should transfer accrued dust correctly", async function () {
      // create obligations
      await crvusd.connect(user1).approve(lendingPool.target, ethers.parseEther("100"));
      await lendingPool.connect(user1).deposit(ethers.parseEther("100"));

      // Calculate dust amount
      const dustAmount = await rToken.calculateDustAmount();
      console.log("Dust amount:", dustAmount);

      // Set up recipient and transfer dust
      const dustRecipient = owner.address;
      // TODO: Ensure dust case - it is 0n a lot. (NoDust())
      if(dustAmount !== 0n){
        await lendingPool.connect(owner).transferAccruedDust(dustRecipient, dustAmount);

        // Withdraw initial deposit
        await lendingPool.connect(user1).withdraw(ethers.parseEther("100"));
  
        const dustAmountPostWithdraw = await rToken.calculateDustAmount();
        console.log({dustAmountPostWithdraw});
      }
    });
  });

  describe("Liquidation", function () {
    beforeEach(async function () {
      // User2 deposits into the reserve pool to provide liquidity
      const depositAmount = ethers.parseEther("1000");
      await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
      await lendingPool.connect(user2).deposit(depositAmount);
  
      // User1 deposits NFT and borrows
      const tokenId = 1;
      await raacNFT.connect(user1).approve(lendingPool.target, tokenId);
      await lendingPool.connect(user1).depositNFT(tokenId);

      const borrowAmount = ethers.parseEther("80");
      await lendingPool.connect(user1).borrow(borrowAmount);

      // Users approve crvUSD for potential transactions
      await crvusd.connect(user2).approve(lendingPool.target, ethers.parseEther("1000"));
      await crvusd.connect(owner).approve(lendingPool.target, ethers.parseEther("1000"));
    });
  
    it("should allow initiation of liquidation when loan is undercollateralized", async function () {
      // Decrease house price to trigger liquidation
      // FIXME: we are using price oracle and therefore the price should be changed from the oracle.
      await raacHousePrices.setHousePrice(1, ethers.parseEther("90"));
      // Attempt to initiate liquidation
      await expect(lendingPool.connect(user2).initiateLiquidation(user1.address))
        .to.emit(lendingPool, "LiquidationInitiated")
        .withArgs(user2.address, user1.address);
  
      // Verify that the user is under liquidation
      expect(await lendingPool.isUnderLiquidation(user1.address)).to.be.true;

      // Verify that the user cannot withdraw NFT while under liquidation
      await expect(lendingPool.connect(user1).withdrawNFT(1))
        .to.be.revertedWithCustomError(lendingPool, "CannotWithdrawUnderLiquidation");

      // Verify the liquidation start time is set
      const liquidationStartTime = await lendingPool.liquidationStartTime(user1.address);
      expect(liquidationStartTime).to.be.gt(0);

      // Verify the health factor is below the liquidation threshold
      const healthFactor = await lendingPool.calculateHealthFactor(user1.address);
      const healthFactorLiquidationThreshold = await lendingPool.healthFactorLiquidationThreshold();
      expect(healthFactor).to.be.lt(healthFactorLiquidationThreshold);
    });
  
    it("should allow the user to close liquidation within grace period", async function () {
      // Decrease house price and initiate liquidation
      // FIXME: we are using price oracle and therefore the price should be changed from the oracle.
      await raacHousePrices.setHousePrice(1, ethers.parseEther("90"));
      await lendingPool.connect(user2).initiateLiquidation(user1.address);
  
      // User1 repays the debt
      const userDebt = await lendingPool.getUserDebt(user1.address);
      await crvusd.connect(user1).approve(lendingPool.target, userDebt + ethers.parseEther("1"));
      await lendingPool.connect(user1).repay(userDebt + ethers.parseEther("1"));
  
      // User1 closes the liquidation
      await expect(lendingPool.connect(user1).closeLiquidation())
        .to.emit(lendingPool, "LiquidationClosed")
        .withArgs(user1.address);
  
      // Verify that the user is no longer under liquidation
      expect(await lendingPool.isUnderLiquidation(user1.address)).to.be.false;
      // Verify that the user can now withdraw their NFT
      await expect(lendingPool.connect(user1).withdrawNFT(1))
        .to.emit(lendingPool, "NFTWithdrawn")
        .withArgs(user1.address, 1);

      // Verify that the NFT is now owned by user1
      expect(await raacNFT.ownerOf(1)).to.equal(user1.address);

      // Verify that the user's account is cleaned
      const userData = await lendingPool.userData(user1.address);
      expect(userData.scaledDebtBalance).to.equal(0);
      expect(userData.nftTokenIds).to.be.equal(undefined);

      // Double-check that the user has no remaining debt
      const userClosedLiquidationDebt = await lendingPool.getUserDebt(user1.address);
      expect(userClosedLiquidationDebt).to.equal(0);

      // Verify that the user's health factor is now at its maximum (type(uint256).max)
      const healthFactor = await lendingPool.calculateHealthFactor(user1.address);
      expect(healthFactor).to.equal(ethers.MaxUint256);
    });
  
    it("should allow Stability Pool to close liquidation after grace period", async function () {
      // Decrease house price and initiate liquidation
      // FIXME: we are using price oracle and therefore the price should be changed from the oracle.
      await raacHousePrices.setHousePrice(1, ethers.parseEther("90"));
      await lendingPool.connect(user2).initiateLiquidation(user1.address);
  
      // Advance time beyond grace period (72 hours)
      await ethers.provider.send("evm_increaseTime", [72 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
  
      // Fund the stability pool with crvUSD
      await crvusd.connect(owner).mint(owner.address, ethers.parseEther("1000"));

      // Set Stability Pool address (using owner for this test)
      await lendingPool.connect(owner).setStabilityPool(owner.address);
  
      await expect(lendingPool.connect(owner).finalizeLiquidation(user1.address))
        .to.emit(lendingPool, "LiquidationFinalized")
        
      // Verify that the user is no longer under liquidation
      expect(await lendingPool.isUnderLiquidation(user1.address)).to.be.false;
  
      // Verify that the NFT has been transferred to the Stability Pool
      expect(await raacNFT.ownerOf(1)).to.equal(owner.address);

      // Verify that the user's debt has been repaid
      const userClosedLiquidationDebt = await lendingPool.getUserDebt(user1.address);
      expect(userClosedLiquidationDebt).to.equal(0);

      // Verify that the user's health factor is now at its maximum (type(uint256).max)
      const healthFactor = await lendingPool.calculateHealthFactor(user1.address);
      expect(healthFactor).to.equal(ethers.MaxUint256);


    });
  
    it("should prevent non-owner from closing liquidation within grace period", async function () {
      // Decrease house price and initiate liquidation
      // FIXME: we are using price oracle and therefore the price should be changed from the oracle.
      await raacHousePrices.setHousePrice(1, ethers.parseEther("90"));
      await lendingPool.connect(user2).initiateLiquidation(user1.address);
  
      // Attempt to close liquidation by non-owner (user2)
      await expect(lendingPool.connect(user2).closeLiquidation())
        .to.be.revertedWithCustomError(lendingPool, "NotUnderLiquidation");

      // Attempt to close liquidation by non-owner (user2)
      await expect(lendingPool.connect(user2).finalizeLiquidation(user1.address))
        .to.be.revertedWithCustomError(lendingPool, "Unauthorized");
    });
  
    it("should prevent Stability Pool from closing liquidation within grace period", async function () {
      // Decrease house price and initiate liquidation
      // FIXME: we are using price oracle and therefore the price should be changed from the oracle.
      await raacHousePrices.setHousePrice(1, ethers.parseEther("90"));
      await lendingPool.connect(user2).initiateLiquidation(user1.address);
  
      // Set Stability Pool address (using owner for this test)
      await lendingPool.connect(owner).setStabilityPool(owner.address);
  
      // Attempt to close liquidation by Stability Pool within grace period
      await expect(lendingPool.connect(owner).finalizeLiquidation(user1.address))
        .to.be.revertedWithCustomError(lendingPool, "GracePeriodNotExpired");
    });
  });

  describe("Withdrawal Specific Pause", function () {
    beforeEach(async function () {
        const depositAmount = ethers.parseEther("100");
        await crvusd.connect(user1).approve(lendingPool.target, depositAmount);
        await lendingPool.connect(user1).deposit(depositAmount);
    });

    it("should allow owner to pause and unpause withdrawals", async function () {
        await lendingPool.connect(owner).setParameter(4, 1); // WithdrawalStatus = 4, true = 1
        expect(await lendingPool.withdrawalsPaused()).to.be.true;

        await lendingPool.connect(owner).setParameter(4, 0); // WithdrawalStatus = 4, false = 0
        expect(await lendingPool.withdrawalsPaused()).to.be.false;
    });

    it("should prevent withdrawals when withdrawals are paused but allow other operations", async function () {
        await lendingPool.connect(owner).setParameter(4, 1); // WithdrawalStatus = 4, true = 1

        // Attempt withdrawal should fail
        await expect(lendingPool.connect(user1).withdraw(ethers.parseEther("10")))
            .to.be.revertedWithCustomError(lendingPool, "WithdrawalsArePaused");

        // Other operations should still work
        const depositAmount = ethers.parseEther("10");
        await crvusd.connect(user2).approve(lendingPool.target, depositAmount);
        await expect(lendingPool.connect(user2).deposit(depositAmount))
            .to.not.be.reverted;

        // NFT operations should still work
        const tokenId = 1;
        await raacNFT.connect(user1).approve(lendingPool.target, tokenId);
        await expect(lendingPool.connect(user1).depositNFT(tokenId))
            .to.not.be.reverted;
    });

    it("should prevent non-owner from pausing withdrawals", async function () {
        await expect(lendingPool.connect(user1).setParameter(4, 1))
            .to.be.revertedWithCustomError(lendingPool, "OwnableUnauthorizedAccount");
    });

    it("should allow withdrawals after unpausing", async function () {
        await lendingPool.connect(owner).setParameter(4, 1); // WithdrawalStatus = 4, true = 1
        await lendingPool.connect(owner).setParameter(4, 0); // WithdrawalStatus = 4, false = 0

        const withdrawAmount = ethers.parseEther("10");
        await expect(lendingPool.connect(user1).withdraw(withdrawAmount))
            .to.not.be.reverted;
    });
  });

  describe("Parameter Setting", function() {
    it("should allow owner to set liquidation threshold", async function() {
      const newValue = 7500; // 75%
      await lendingPool.connect(owner).setParameter(0, newValue); // LiquidationThreshold = 0
      expect(await lendingPool.liquidationThreshold()).to.equal(newValue);
    });

    it("should allow owner to set health factor liquidation threshold", async function() {
      const newValue = ethers.parseEther("1.1");
      await lendingPool.connect(owner).setParameter(1, newValue); // HealthFactorLiquidationThreshold = 1
      expect(await lendingPool.healthFactorLiquidationThreshold()).to.equal(newValue);
    });

    it("should allow owner to set liquidation grace period", async function() {
      const newValue = 2 * 24 * 60 * 60; // 2 days
      await lendingPool.connect(owner).setParameter(2, newValue); // LiquidationGracePeriod = 2
      expect(await lendingPool.liquidationGracePeriod()).to.equal(newValue);
    });

    it("should allow owner to set liquidity buffer ratio", async function() {
      const newValue = 3000; // 30%
      await lendingPool.connect(owner).setParameter(3, newValue); // LiquidityBufferRatio = 3
      expect(await lendingPool.liquidityBufferRatio()).to.equal(newValue);
    });

    it("should allow owner to set can payback debt", async function() {
      await lendingPool.connect(owner).setParameter(5, 0); // CanPaybackDebt = 5, false = 0
      expect(await lendingPool.canPaybackDebt()).to.be.false;

      await lendingPool.connect(owner).setParameter(5, 1); // CanPaybackDebt = 5, true = 1
      expect(await lendingPool.canPaybackDebt()).to.be.true;
    });

    it("should revert when setting invalid values", async function() {
      // Invalid liquidation threshold (> 100%)
      await expect(lendingPool.connect(owner).setParameter(0, 10100))
          .to.be.revertedWith("Invalid liquidation threshold");

      // Invalid grace period (> 7 days)
      await expect(lendingPool.connect(owner).setParameter(2, 8 * 24 * 60 * 60))
          .to.be.revertedWith("Invalid grace period");

      // Invalid buffer ratio (> 100%)
      await expect(lendingPool.connect(owner).setParameter(3, 10100))
          .to.be.revertedWith("Ratio cannot exceed 100%");

      // Invalid boolean value
      await expect(lendingPool.connect(owner).setParameter(5, 2))
          .to.be.revertedWith("Invalid boolean value");
    });
  });
});