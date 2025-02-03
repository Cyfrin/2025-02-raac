import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ReserveLibrary", function () {
  let reserveLibrary;
  let owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy the ReserveLibraryMock contract
    const ReserveLibraryMockFactory = await ethers.getContractFactory("ReserveLibraryMock");
    reserveLibrary = await ReserveLibraryMockFactory.deploy();
  });

  describe("Deposit and Withdrawal Functionality", function () {
    it("should correctly update totalLiquidity after a deposit", async function () {
      const depositAmount = ethers.parseEther("1");
      
      const initialData = await reserveLibrary.getReserveData();
      expect(initialData.totalLiquidity).to.equal(0);

      await reserveLibrary.deposit(depositAmount);

      const finalData = await reserveLibrary.getReserveData();
      expect(finalData.totalLiquidity).to.equal(depositAmount);
    });

    it("should correctly update totalLiquidity after a withdrawal", async function () {
      const depositAmount = ethers.parseEther("2");
      const withdrawAmount = ethers.parseEther("1");

      // Perform deposit
      await reserveLibrary.deposit(depositAmount);

      // Perform withdrawal
      await reserveLibrary.withdraw(withdrawAmount);

      // totalLiquidity should now equal depositAmount - withdrawAmount
      const reserveDataAfterWithdrawal = await reserveLibrary.getReserveData();
      expect(reserveDataAfterWithdrawal.totalLiquidity).to.equal(depositAmount - withdrawAmount);
    });

    it("should handle zero deposit amount correctly", async function () {
      const zeroAmount = ethers.parseEther("0");
      await expect(reserveLibrary.deposit(zeroAmount))
        .to.be.revertedWithCustomError(reserveLibrary, "InvalidAmount");
    });

    it("should handle zero withdrawal amount correctly", async function () {
      const zeroAmount = ethers.parseEther("0");
      await expect(reserveLibrary.withdraw(zeroAmount))
        .to.be.revertedWithCustomError(reserveLibrary, "InvalidAmount");
    });

    it("should not allow withdrawing more than totalLiquidity", async function () {
      const depositAmount = ethers.parseEther("1");
      const withdrawAmount = ethers.parseEther("2");

      await reserveLibrary.deposit(depositAmount);

      await expect(reserveLibrary.withdraw(withdrawAmount))
        .to.be.revertedWithCustomError(reserveLibrary, "InsufficientLiquidity");
    });

    it("should handle large deposit amounts without overflow", async function () {
      const largeAmount = ethers.parseUnits("1", 30); // 1e30

      // Perform deposit
      await reserveLibrary.deposit(largeAmount);

      // totalLiquidity should equal the large amount
      const reserveDataAfterDeposit = await reserveLibrary.getReserveData();
      expect(reserveDataAfterDeposit.totalLiquidity).to.equal(largeAmount);
    });
  });

  describe("Interest Accrual and Rate Updates", function () {
    it("should handle setting an excessively high prime rate", async function () {
      // First set up valid initial rates
      await reserveLibrary.setRateParameters(
        ethers.parseEther("0.05"),  // baseRate (5%)
        ethers.parseEther("0.10"),  // primeRate (10%)
        ethers.parseEther("0.15"),  // optimalRate (15%)
        ethers.parseEther("1.0"),   // maxRate (100%)
        ethers.parseEther("0.5")    // optimalUtilizationRate (50%)
      );

      // Get initial state
      const initialRateData = await reserveLibrary.getRateData();
      
      // Set an extremely high prime rate (1000%)
      const highPrimeRate = ethers.parseEther("10");
      
      // For extremely high rates, we need to adjust other rates first
      await reserveLibrary.setRateParameters(
        highPrimeRate / 2n,         // baseRate (500%)
        highPrimeRate,                // primeRate (1000%)
        highPrimeRate * 3n / 4n,  // optimalRate (750%)
        highPrimeRate * 2n,         // maxRate (2000%)
        ethers.parseEther("0.5")      // keep optimal utilization at 50%
      );
      
      // Verify the new prime rate was set
      const finalRateData = await reserveLibrary.getRateData();
      expect(finalRateData.primeRate).to.equal(highPrimeRate);
      
      // Verify the relationships between rates are maintained
      expect(finalRateData.baseRate).to.be.lt(finalRateData.primeRate);
      expect(finalRateData.primeRate).to.be.lt(finalRateData.maxRate);
      expect(finalRateData.baseRate).to.be.lt(finalRateData.optimalRate);
      expect(finalRateData.optimalRate).to.be.lt(finalRateData.maxRate);
    });
  });

  describe("Security and Vulnerability Tests", function () {
    it("should handle division by zero gracefully", async function () {
      // Ensure totalLiquidity and totalUsage are zero
      const reserveData = await reserveLibrary.getReserveData();
      expect(reserveData.totalLiquidity).to.equal(0);
      expect(reserveData.totalUsage).to.equal(0);

      // Calculate utilization rate
      const utilizationRate = await reserveLibrary.calculateUtilizationRate();

      // Utilization rate should be zero and not throw an error
      expect(utilizationRate).to.equal(0);
    });

    it("should prevent overflow when calculating interest", async function () {
      const depositAmount = ethers.MaxUint256;

      // Attempt to deposit the maximum uint256 value
      await expect(reserveLibrary.deposit(depositAmount)).to.be.reverted;
    });

    it("should not allow zero or negative prime rates", async function () {
      const zeroRate = 0;
      await expect(reserveLibrary.setPrimeRate(zeroRate))
        .to.be.revertedWithCustomError(reserveLibrary, "PrimeRateMustBePositive");
    });
  });
});
