import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("RAACMinter", function () {
  let RAACToken, RAACMinter, MockLendingPool, MockStabilityPool;
  let raacToken, raacMinter, lendingPool, stabilityPool;
  let owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    RAACToken = await ethers.getContractFactory("RAACToken");
    raacToken = await RAACToken.deploy(owner.address, 100, 50);

    MockLendingPool = await ethers.getContractFactory("MockLendingPool");
    lendingPool = await MockLendingPool.deploy();

    MockStabilityPool = await ethers.getContractFactory("MockStabilityPool");
    stabilityPool = await MockStabilityPool.deploy(await raacToken.getAddress());

    RAACMinter = await ethers.getContractFactory("RAACMinter");
    raacMinter = await RAACMinter.deploy(
      await raacToken.getAddress(),
      await stabilityPool.getAddress(),
      await lendingPool.getAddress(),
      owner.address
    );

    await raacToken.setMinter(await raacMinter.getAddress());
  });

  it('should have initial emission rate', async function () {
    const initialEmissionRate = await raacMinter.emissionRate();
    expect(initialEmissionRate).to.not.equal(0);
    expect(initialEmissionRate).to.equal(138888888888888888n);
  });

  it("should update emission rate based on utilization", async function () {
    await lendingPool.mockGetNormalizedDebt(ethers.parseEther("80000"));
    await stabilityPool.mockGetTotalDeposits(ethers.parseEther("100000"));

    const initialEmissionRate = await raacMinter.emissionRate();
    expect(initialEmissionRate).to.equal(138888888888888888n);
    console.log("initialEmissionRate", initialEmissionRate);
    await raacMinter.updateEmissionRate();
    const newEmissionRate = await raacMinter.emissionRate();
    console.log("newEmissionRate", newEmissionRate);
    expect(newEmissionRate).to.not.equal(initialEmissionRate);
    expect(newEmissionRate).to.equal(145833333333333332n);
  });

  it("should mint tokens when ticked", async function () {
    const initialSupply = await raacToken.totalSupply();
    await raacMinter.tick();
    const newSupply = await raacToken.totalSupply();

    expect(newSupply).to.be.gt(initialSupply);
  });

  it("should allow owner to set parameters", async function () {
    const newMinEmissionRate = ethers.parseEther("50") / 7200n; // 50 RAAC per day
    await raacMinter.setMinEmissionRate(newMinEmissionRate);
    expect(await raacMinter.minEmissionRate()).to.equal(newMinEmissionRate);

    const newMaxEmissionRate = ethers.parseEther("3000") / 7200n; // 3000 RAAC per day
    await raacMinter.setMaxEmissionRate(newMaxEmissionRate);
    expect(await raacMinter.maxEmissionRate()).to.equal(newMaxEmissionRate);

    const newAdjustmentFactor = 10;
    await raacMinter.setAdjustmentFactor(newAdjustmentFactor);
    expect(await raacMinter.adjustmentFactor()).to.equal(newAdjustmentFactor);

    const newUtilizationTarget = 80;
    await raacMinter.setUtilizationTarget(newUtilizationTarget);
    expect(await raacMinter.utilizationTarget()).to.equal(newUtilizationTarget);
  });

  it("should not allow non-owner to set parameters", async function () {
    await expect(raacMinter.connect(user1).setMinEmissionRate(100))
      .to.be.revertedWithCustomError(raacMinter, "AccessControlUnauthorizedAccount");

    await expect(raacMinter.connect(user1).setMaxEmissionRate(1000))
      .to.be.revertedWithCustomError(raacMinter, "AccessControlUnauthorizedAccount");

    await expect(raacMinter.connect(user1).setAdjustmentFactor(5))
      .to.be.revertedWithCustomError(raacMinter, "AccessControlUnauthorizedAccount");

    await expect(raacMinter.connect(user1).setUtilizationTarget(75))
      .to.be.revertedWithCustomError(raacMinter, "AccessControlUnauthorizedAccount");
  });

  // describe("RAACToken Ownership Transfer", function () {
    // it("should allow owner to initiate RAACToken ownership transfer", async function () {
    //   const tx = await raacMinter.connect(owner).initiateRAACTokenOwnershipTransfer(user1.address);
    //   await expect(tx).to.emit(raacMinter, "RAACTokenOwnershipTransferInitiated")
    //     .withArgs(user1.address, await ethers.provider.getBlock('latest').then(b => b.timestamp + 7 * 24 * 60 * 60));
      
    //   expect(await raacMinter.pendingRAACTokenOwner()).to.equal(user1.address);
    // });

    // it("should not allow non-owner to initiate RAACToken ownership transfer", async function () {
    //   await expect(raacMinter.connect(user1).initiateRAACTokenOwnershipTransfer(user1.address))
    //     .to.be.revertedWithCustomError(raacMinter, "AccessControlUnauthorizedAccount");
    // });

    // it("should not allow completing RAACToken ownership transfer before delay period", async function () {
    //   await raacMinter.connect(owner).initiateRAACTokenOwnershipTransfer(user1.address);
    //   await expect(raacMinter.connect(owner).completeRAACTokenOwnershipTransfer())
    //     .to.be.revertedWithCustomError(raacMinter, "OwnershipTransferNotDue");
    // });

    // it("should allow completing RAACToken ownership transfer after delay period", async function () {
    //   await raacMinter.connect(owner).initiateRAACTokenOwnershipTransfer(user1.address);
      
    //   // Increase time by 7 days
    //   await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
    //   await ethers.provider.send("evm_mine");

    //   const tx = await raacMinter.connect(owner).completeRAACTokenOwnershipTransfer();
    //   await expect(tx).to.emit(raacMinter, "RAACTokenOwnershipTransferred")
    //     .withArgs(user1.address);

    //   expect(await raacToken.owner()).to.equal(user1.address);
    // });

    // it("should not allow completing RAACToken ownership transfer after window expires", async function () {
    //   await raacMinter.connect(owner).initiateRAACTokenOwnershipTransfer(user1.address);
      
    //   // Increase time by 8 days
    //   await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    //   await ethers.provider.send("evm_mine");

    //   await expect(raacMinter.connect(owner).completeRAACTokenOwnershipTransfer())
    //     .to.be.revertedWithCustomError(raacMinter, "OwnershipTransferExpired");
    // });

    // it("should not allow non-owner to complete RAACToken ownership transfer", async function () {
    //   await raacMinter.connect(owner).initiateRAACTokenOwnershipTransfer(user1.address);
      
    //   // Increase time by 7 days
    //   await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
    //   await ethers.provider.send("evm_mine");

    //   await expect(raacMinter.connect(user1).completeRAACTokenOwnershipTransfer())
    //     .to.be.revertedWithCustomError(raacMinter, "AccessControlUnauthorizedAccount");
    // });
  // });
});