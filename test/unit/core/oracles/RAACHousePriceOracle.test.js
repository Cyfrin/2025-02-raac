import {expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;


describe("RAACHousePriceOracle (MockedTest)", function () {
    let deployer, address2,  testOracle, mockOracle, mockRouter, housePrices;

    beforeEach(async function () {
        [deployer,address2] = await ethers.getSigners();
        const donId = ethers.encodeBytes32String("1");

        // Deploy house prices contract;
        const HousePrices = await ethers.getContractFactory("RAACHousePrices");
        housePrices = await HousePrices.deploy(deployer.address);
        await housePrices.waitForDeployment();

        // Deploy mock functions router
        const MockRouter = await ethers.getContractFactory("MockFunctionsRouter");
        mockRouter = await MockRouter.deploy();
        await mockRouter.waitForDeployment();

        // Deploy test RAACHousePriceOracle
        const RAACHousePriceOracle = await ethers.getContractFactory("TestRAACHousePriceOracle");
        testOracle = await RAACHousePriceOracle.deploy(await mockRouter.getAddress(), donId, await housePrices.getAddress());
        await testOracle.waitForDeployment();

        // Deploy mock 1 DON Oracle
        const MockOracle  = await ethers.getContractFactory("MockOracle");
        mockOracle = await MockOracle.deploy(donId);
        await mockOracle.waitForDeployment();

        // Set the oracle address on the house price contract
        await housePrices.setOracle(await testOracle.getAddress());

    });
    it("Should revert an error if non-oracleOnly address tries to update price", async function () {
        // revert Unauthorized()
        await expect(housePrices.setHousePrice(1, 129999)).to.be.revertedWith("RAACHousePrices: caller is not the oracle");
    });
    it("Should revert if non-owner tries to set oracle", async function () {
        // use address2 to simulate non owner
        await expect(housePrices.connect(address2).setOracle(await testOracle.getAddress())).to.be.revertedWithCustomError(housePrices, "OwnableUnauthorizedAccount")
    });
    it("Should revert if non-owner tries to send request", async function () {
        await expect(testOracle.connect(address2).sendRequest(
            "console.log('hello world'); return 129999.99;", // Some JS source
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
          "console.log('hello world'); return 129999.99;", // Some JS source
          1,     // secretsLocation
          "0x",   // no secrets
          ["1"],     // string[] args - [houseId]
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
        const lastHouseId = await testOracle.lastHouseId();
        expect("1").to.be.equal(lastHouseId);
      });

      it("Should simulate fulfillment and update housePrice", async function () {
        const lastRequestId = await testOracle.s_lastRequestId();
        const fakePrice = 129999; // the response is the house price
        const responseBytes = new ethers.AbiCoder().encode(["uint256"], [fakePrice]);

        const tx = await testOracle.sendRequest(
            "console.log('hello world'); return 129999.99;", // Some JS source
            1,     // secretsLocation
            "0x",   // no secrets
            ["1"],     // string[] args - [houseId]
            [],     // bytes[] bytesArgs
            1,      // subscriptionId
            200000  // callbackGasLimit
          );
          await tx.wait();
    
        // Simulate the DON calling fulfillRequest
        await mockOracle.fulfillRequest(
          await testOracle.getAddress(),
          lastRequestId,
          responseBytes,
          "0x"
        );

        // check that the house price has been updated
        const [housePrice, lastUpdateTimestamp] = await housePrices.getLatestPrice(1);
        console.log("housePrice", housePrice);
        expect(housePrice).to.equal(fakePrice);
      });
    
})