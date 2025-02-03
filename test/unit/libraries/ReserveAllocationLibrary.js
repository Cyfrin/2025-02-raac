import { expect } from "chai";
import hre from "hardhat";
const { ethers, network } = hre;

describe("ReserveAllocationLibrary", function () {
  let ReserveAllocationLibraryMock;
  let reserveAllocationLibrary;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the ReserveAllocationLibraryMock contract
    const ReserveAllocationLibraryMockFactory = await ethers.getContractFactory("ReserveAllocationLibraryMock");
    reserveAllocationLibrary = await ReserveAllocationLibraryMockFactory.deploy();

    // Set initial prime rate
    const initialPrimeRate = ethers.parseEther("0.1"); // 10%
    await reserveAllocationLibrary.setPrimeRate(initialPrimeRate);
  });

  describe("Borrow and Repay Functionality", function () {
    it("should correctly update totalUsage after a borrow", async function () {
      const depositAmount = ethers.parseEther("10");
      const borrowAmount = ethers.parseEther("1");

      // Add liquidity
      await reserveAllocationLibrary.addLiquidity(depositAmount);

      // Perform borrow
      await reserveAllocationLibrary.borrow(borrowAmount, user1.address);

      // totalUsage should now equal the scaled borrow amount
      const reserveDataAfterBorrow = await reserveAllocationLibrary.getReserveData();
      const normalizedDebt = reserveDataAfterBorrow.usageIndex;
      const expectedTotalUsage = (borrowAmount * BigInt(1e18)) / normalizedDebt;
      expect(reserveDataAfterBorrow.totalUsage).to.equal(expectedTotalUsage);
    });

    it("should correctly update totalUsage after a repay", async function () {
      const depositAmount = ethers.parseEther("10");
      const borrowAmount = ethers.parseEther("2");
      const repayAmount = ethers.parseEther("1");
    
      // Add liquidity and borrow
      await reserveAllocationLibrary.addLiquidity(depositAmount);
      await reserveAllocationLibrary.borrow(borrowAmount, user1.address);
    
      // Get data before repay
      const reserveDataBeforeRepay = await reserveAllocationLibrary.getReserveData();
    
      // Perform repay
      await reserveAllocationLibrary.repay(repayAmount, user1.address);
    
      // Get data after repay
      const reserveDataAfterRepay = await reserveAllocationLibrary.getReserveData();
    
      // Check if usageIndex is not zero to avoid division by zero
      if (reserveDataAfterRepay.usageIndex == 0) {
        throw new Error("Usage index is zero, which is unexpected");
      }
    
      // Calculate expected total usage
      const normalizedDebt = reserveDataAfterRepay.usageIndex;
      let expectedTotalUsage = (borrowAmount - repayAmount) * BigInt(1e18) / normalizedDebt;
    
      // Compare with a small tolerance due to potential rounding errors
      
      const tolerance = ethers.parseEther("0.0000002"); // 2e-7 ETH tolerance
      expect(reserveDataAfterRepay.totalUsage).to.be.closeTo(expectedTotalUsage, tolerance);
      const actualDiff = reserveDataAfterRepay.totalUsage - expectedTotalUsage;
      const actualDiffPercentageWithPrecision = Number(
        ethers.formatUnits(
          (actualDiff * BigInt(1e10) * BigInt(100)) / reserveDataBeforeRepay.totalUsage,
          10
        )
      );
      console.log("actualDiffPercentageWithPrecision", actualDiffPercentageWithPrecision.toFixed(20));
      expect(actualDiffPercentageWithPrecision).to.be.closeTo(0, 0.0001);

    });

    it("should not allow borrowing more than available liquidity", async function () {
      const depositAmount = ethers.parseEther("1");
      const borrowAmount = ethers.parseEther("2");

      // Add liquidity
      await reserveAllocationLibrary.addLiquidity(depositAmount);

      // Attempt to borrow more than deposited
      await expect(reserveAllocationLibrary.borrow(borrowAmount, user1.address))
        .to.be.revertedWith("Insufficient liquidity");
    });
  });

  describe("Fund Allocation", function () {
    it("should correctly allocate funds", async function () {
      const depositAmount = ethers.parseEther("10");
      const allocateAmount = ethers.parseEther("1");

      // Add liquidity
      await reserveAllocationLibrary.addLiquidity(depositAmount);

      // Allocate funds
      await reserveAllocationLibrary.allocateFunds(allocateAmount, user2.address);

      // totalLiquidity should be reduced by the allocated amount
      const reserveDataAfterAllocation = await reserveAllocationLibrary.getReserveData();
      expect(reserveDataAfterAllocation.totalLiquidity).to.equal(depositAmount - allocateAmount);
    });

    it("should not allow allocating more than available liquidity", async function () {
      const depositAmount = ethers.parseEther("1");
      const allocateAmount = ethers.parseEther("2");

      // Add liquidity
      await reserveAllocationLibrary.addLiquidity(depositAmount);

      // Attempt to allocate more than available
      await expect(reserveAllocationLibrary.allocateFunds(allocateAmount, user2.address))
        .to.be.revertedWith("Insufficient liquidity in reserve");
    });
  });

  describe("Interest Rates and Prime Rate", function () {
    it("should limit prime rate changes to 5% in both directions", async function () {
      // Set initial prime rate
      const initialPrimeRate = ethers.parseEther("0.1"); // 10%
      await reserveAllocationLibrary.setPrimeRate(initialPrimeRate);

      // Test increase within 5% limit
      const validIncrease = ethers.parseEther("0.104"); // 10.4%
      await expect(reserveAllocationLibrary.setPrimeRate(validIncrease)).to.not.be.reverted;

      // Test decrease within 5% limit
      const validDecrease = ethers.parseEther("0.099"); // 9.9%
      await expect(reserveAllocationLibrary.setPrimeRate(validDecrease)).to.not.be.reverted;

      // Test increase exceeding 5% limit
      const invalidIncrease = ethers.parseEther("0.106"); // 10.6%
      await expect(reserveAllocationLibrary.setPrimeRate(invalidIncrease))
        .to.be.revertedWith("Prime rate change exceeds 5% limit");

      // Test decrease exceeding 5% limit
      const invalidDecrease = ethers.parseEther("0.093"); // 9.3%
      await expect(reserveAllocationLibrary.setPrimeRate(invalidDecrease))
        .to.be.revertedWith("Prime rate change exceeds 5% limit");

      // Verify final prime rate is within expected range
      const finalReserveData = await reserveAllocationLibrary.getReserveData();
      expect(finalReserveData.primeRate).to.be.closeTo(validDecrease, ethers.parseEther("0.0001"));
    });
  });

  describe("Security and Edge Cases", function () {
    it("should handle division by zero gracefully in utilization rate calculation", async function () {
      // Ensure totalLiquidity and totalUsage are zero
      const reserveData = await reserveAllocationLibrary.getReserveData();
      expect(reserveData.totalLiquidity).to.equal(0n);
      expect(reserveData.totalUsage).to.equal(0n);

      // Calculate utilization rate
      const utilizationRate = await reserveAllocationLibrary.calculateUtilizationRate();

      // Utilization rate should be zero and not throw an error
      expect(utilizationRate).to.equal(0n);
    });

    it("should not allow negative interest rates", async function () {
      // Since we cannot pass negative values, we test with zero
      await expect(reserveAllocationLibrary.setPrimeRate(0))
        .to.be.revertedWith("Prime rate must be positive");
    });

    it("should handle large deposit amounts without overflow", async function () {
      const largeAmount = ethers.parseUnits("1", 30); // 1e30

      // Add large amount of liquidity
      await reserveAllocationLibrary.addLiquidity(largeAmount);

      // totalLiquidity should equal the large amount
      const reserveDataAfterDeposit = await reserveAllocationLibrary.getReserveData();
      expect(reserveDataAfterDeposit.totalLiquidity).to.equal(largeAmount);
    });
  });
});
