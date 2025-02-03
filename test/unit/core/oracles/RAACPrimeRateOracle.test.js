import {expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("RAACPrimeRateOracle (MockedTest)", function () {
  let deployer, address2, testOracle, mockOracle, mockRouter, lendingPool;

  before(async function () {
    [deployer, address2] = await ethers.getSigners();
    const donId = ethers.encodeBytes32String("1");

    // Deploy mock functions router
    const MockRouter = await ethers.getContractFactory("MockFunctionsRouter");
    mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();

    // Deploy mock tokens first
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const reserveAsset = await MockToken.deploy("Mock Reserve", "MRES");
    await reserveAsset.waitForDeployment();

    const RToken = await ethers.getContractFactory("RToken");
    const rToken = await RToken.deploy("RToken", "RT", deployer.address, await reserveAsset.getAddress());
    await rToken.waitForDeployment();

    const DebtToken = await ethers.getContractFactory("DebtToken"); 
    const debtToken = await DebtToken.deploy("DebtToken", "DT", deployer.address);
    await debtToken.waitForDeployment();

    const MockNFT = await ethers.getContractFactory("ERC721Mock");
    const mockNFT = await MockNFT.deploy("Mock NFT", "MNFT");
    await mockNFT.waitForDeployment();

    const MockPriceOracle = await ethers.getContractFactory("TestRAACHousePriceOracle");
    const priceOracle = await MockPriceOracle.deploy(await mockRouter.getAddress(), donId, await mockNFT.getAddress());
 
    await priceOracle.waitForDeployment();

    // Deploy lending pool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(
      await reserveAsset.getAddress(),
      await rToken.getAddress(),
      await debtToken.getAddress(),
      await mockNFT.getAddress(),
      await priceOracle.getAddress(),
      ethers.parseUnits("0.1", 27) // initialPrimeRate
    );
    await lendingPool.waitForDeployment();

    // Deploy test RAACPrimeRateOracle
    const RAACPrimeRateOracle = await ethers.getContractFactory("TestRAACPrimeRateOracle");
    testOracle = await RAACPrimeRateOracle.deploy(await mockRouter.getAddress(), donId, await lendingPool.getAddress());
    await testOracle.waitForDeployment();

    // Set the oracle address on the lending pool contract
    await lendingPool.setPrimeRateOracle(await testOracle.getAddress());

    // Deploy mock 1 DON Oracle
    const MockOracle = await ethers.getContractFactory("MockOracle");
    mockOracle = await MockOracle.deploy(donId);
    await mockOracle.waitForDeployment();
  });

  it("Should revert an error if non-oracleOnly address tries to update price", async function () {
    await expect(lendingPool.setPrimeRate(1)).to.be.revertedWithCustomError(lendingPool, "Unauthorized");
  });

  it("Should revert if non-owner tries to set oracle", async function () {
    await expect(lendingPool.connect(address2).setPrimeRateOracle(await testOracle.getAddress())).to.be.revertedWithCustomError(lendingPool, "OwnableUnauthorizedAccount");
  });

  it("Should revert if non-owner tries to send request", async function () {
    await expect(testOracle.connect(address2).sendRequest(
      "console.log('hello world'); return 5;", // Some JS source
      1,     // secretsLocation
      "0x",   // no secrets
      [],     // string[] args
      [],     // bytes[] bytesArgs
      1,      // subscriptionId
      200000  // callbackGasLimit
    )).to.be.revertedWith("Only callable by owner");
  });

  it("Should send a request and store its requestId", async function () {
    // Call `sendRequest` with dummy values
    const tx = await testOracle.sendRequest(
      "console.log('hello world'); return 5;", // Some JS source
      1,     // secretsLocation
      "0x",   // no secrets
      [],     // string[] args
      [],     // bytes[] bytesArgs
      1,      // subscriptionId
      200000  // callbackGasLimit
    );
    await tx.wait();
    // Check that s_lastRequestId is now non-zero
    const lastRequestId = await testOracle.s_lastRequestId();
    expect(lastRequestId).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("Should simulate fulfillment and update lastPrimeRate", async function () {
    const lastRequestId = await testOracle.s_lastRequestId();
    // in the setup, the initial prime rate is 0.1. If value exceeds a threshold, PrimeRateChangeExceedsLimit is emitted
    const fakePrimeRate = ethers.parseUnits("0.104", 27);
    const responseBytes = new ethers.AbiCoder().encode(["uint256"], [fakePrimeRate]);

    // Simulate the DON calling fulfillRequest
    await mockOracle.fulfillRequest(
      await testOracle.getAddress(),
      lastRequestId,
      responseBytes,
      "0x"
    );

    const primeRate = await lendingPool.getPrimeRate();
    expect(primeRate).to.equal(fakePrimeRate);
  });
    
})