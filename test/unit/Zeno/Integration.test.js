import { expect } from "chai";
import hre from "hardhat";
const { ethers, network } = hre;



const canLog = true;
const log = (msg, ...optional) =>
	canLog ? console.log(msg, ...optional) : null;


// extend the type of .connect() which will return the type of the contract

describe("Test specific auction and bond", function () {
	let AuctionFactory, auctionFactory
	let ZENOFactory, zenoFactory
	let USDC, usdc

	let auctionFactoryAddress,
		zenoFactoryAddress,
		usdcAddress

	let owner,
		addr1,
		addr2

	let auction1Address, zeno1Address;
	let auction1, zeno1;

	let businessAccount, businessAddress;
	let auctionStartTime, auctionEndTime;
	let startingPrice, reservePrice;
	let totalZENOAllocated, totalZENORemaining;

	beforeEach(async function () {
		[owner, addr1, addr2, businessAccount] = await ethers.getSigners();
		businessAddress = await businessAccount.getAddress();

		// Set maturity date for RCB

		// Deploy USDC Token
		const initialSupply = ethers.parseUnits("1000000", 6); // 1,000,000 USDC
		usdc = (await ethers.deployContract("MockUSDC", [initialSupply])) ;
		await usdc.waitForDeployment();
		usdcAddress = await usdc.getAddress();
		// log("USDC Address:", usdcAddress);

		// Deploy Auction Factory
		AuctionFactory = await ethers.getContractFactory("AuctionFactory");
		auctionFactory = (await ethers.deployContract("AuctionFactory", [
			owner.address,
		])) ;
		await auctionFactory.waitForDeployment();
		auctionFactoryAddress = await auctionFactory.getAddress();
		// log("Auction Factory Address:", auctionFactoryAddress);

		// Deploy ZENO Factory
		ZENOFactory = await ethers.getContractFactory("ZENOFactory");
		zenoFactory = (await ethers.deployContract("ZENOFactory", [
			owner.address,
		])) ;
		await zenoFactory.waitForDeployment();
		zenoFactoryAddress = await zenoFactory.getAddress();
		// log("ZENO Factory Address:", zenoFactoryAddress);

		// Create a new ZENO Contract
		const maturityDate = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year later

		// Deploy a new ZENO Contract for Auction
		await zenoFactory.createZENOContract(usdcAddress, maturityDate);

		expect(await zenoFactory.getZENOCount()).to.equal(1);

		// Get the address of the ZENO contract
		zeno1Address = await zenoFactory.getZENO(0);
		zeno1 = (await ethers.getContractAt("ZENO", zeno1Address)) ;

		// Set Auction contract
		auctionStartTime = Math.floor(Date.now() / 1000) + 1 * 3600; // 1 hour later
		auctionEndTime = auctionStartTime + 86400; // 1 day later
		startingPrice = ethers.parseUnits("100", 6); // 100 USDC
		reservePrice = ethers.parseUnits("10", 6); // 10 USDC
		totalZENOAllocated = 10; // 10 Bonds allocated for the auction
		totalZENORemaining = totalZENOAllocated;

		// Deploy Auction contract
		await auctionFactory.createAuction(
			zeno1Address,
			usdcAddress,
			businessAddress,
			auctionStartTime,
			auctionEndTime,
			startingPrice,
			reservePrice,
			totalZENOAllocated
		);
		auction1Address = await auctionFactory.getAuction(0);
		auction1 = (await ethers.getContractAt("Auction", auction1Address)) ;

		// Transfer ZENO ownership to the auction contract
		zenoFactory.transferZenoOwnership(0, auction1Address);

		// Mint USDC tokens to addr1 and approve the auction contract
		await usdc.mint(addr1.address, ethers.parseUnits("10000", 6));
		await usdc.mint(businessAddress, ethers.parseUnits("10000", 6));
		const balance = await usdc.balanceOf(addr1.address);
		log(`Balance of addr1: ${balance}`);
	});
	afterEach(async function () {
		// reset the blocks time
		await network.provider.request({
			method: "hardhat_reset",
			params: [],
		});
	});

	// Auction and ZENO testings

	it("Should not allow buying tokens before the auction starts", async function () {
		let amountToBuy = 1;

		await expect(auction1.connect(addr1).buy(amountToBuy)).to.be.revertedWith(
			"Auction not started"
		);
	});

	it("should advance time and mine a block", async function () {
        // Record the current block timestamp
        const initialBlock = await ethers.provider.getBlock("latest");
        const initialTimestamp = initialBlock.timestamp;
		log("Block time", initialTimestamp)

        // Increase EVM time by 1 hour (3600 seconds)
        await ethers.provider.send("evm_increaseTime", [3600*2]);

        // Mine a block
        await ethers.provider.send("evm_mine", []);

		const auctionState = await auction1.state();
		log("Auction start time", auctionState.startTime);

        // Fetch the new block timestamp
        const newBlock = await ethers.provider.getBlock("latest");
        const newTimestamp = newBlock.timestamp;

		log("Block time", newTimestamp)

        // Verify the time has advanced
        expect(newTimestamp).to.be.greaterThan(initialTimestamp);
        log(`Time advanced by: ${newTimestamp - initialTimestamp} seconds`);
    });

	it("Should allow a user to buy tokens during the auction", async function () {
		let amountToBuy = 1;

		// Increase time to auctionStartTime
		// Increase EVM time by 1 hour (3600 seconds)
		await ethers.provider.send("evm_increaseTime", [3600*1.5]);

		// Mine a single block
		await ethers.provider.send("evm_mine", []);

		const auctionStateForPrice = await auction1.state();
		const price = await auction1.getPrice();
		log(`Price: ${price}`);

		const cost = parseFloat(price) * amountToBuy;

		// Approve the auction contract
		const allowance = await usdc.allowance(addr1.address, auction1Address);

		if (allowance < cost) {
			const approveTx = await usdc
				.connect(addr1)
				.approve(auction1Address, cost);
			await approveTx.wait();
		}

		const balance = await usdc.balanceOf(addr1.address);
		log(`Balance of addr1: ${balance}`);

		// const costRangeLow = cost - 100000;
		// const costRangeHigh = cost + 100000;

		await expect(auction1.connect(addr1).buy(amountToBuy)).to.emit(
			auction1,
			"ZENOPurchased"
		);

		// Check that the business account has the correct amount of USDC
		const businessBalance = await usdc.balanceOf(businessAddress);
		log(`Business Balance: ${businessBalance}`);
		// expect(await usdc.balanceOf(businessAddress)).to.within(
		// 	costRangeLow,
		// 	costRangeHigh
		// );

		// Check that user has correct amount of ZENO bonds
		const userBalance = await zeno1.balanceOf(addr1.address);
		log(`User ${await zeno1.symbol()} Balance: ${userBalance}`);

		expect(await zeno1.balanceOf(addr1.address)).to.equal(amountToBuy);

		// Check the balance in the auction contract
		const auctionBidBalance = await auction1.bidAmounts(addr1.address);
		expect(auctionBidBalance).to.equal(amountToBuy);

		const auctionStateForBidder = await auction1.state();
		expect(auctionStateForBidder.lastBidder).to.be.equal(addr1.address);

		// Check that totalRCBRemaining has been updated
		totalZENORemaining = totalZENOAllocated - amountToBuy;
		expect(auctionStateForBidder.totalRemaining).to.equal(totalZENORemaining);
		expect(await zeno1.totalZENOMinted()).to.equal(amountToBuy);
	});

	it("Should not allow to buy tokens if we finish the maximum amount of tokens", async function () {
		let amountToBuy = totalZENOAllocated;

		// Increase time to auctionStartTime
		await ethers.provider.send("evm_increaseTime", [3600 * 1.5]);
		await ethers.provider.send("evm_mine");

		const auctionStateForRemaining = await auction1.state();
		const amount = auctionStateForRemaining.totalRemaining;
		log(`Total ZENO Remaining: ${amount}`);

		const price = await auction1.getPrice();
		const cost = parseFloat(price) * amountToBuy;

		// Approve the auction contract
		const allowance = await usdc.allowance(addr1.address, auction1Address);

		if (allowance < cost) {
			const approveTx = await usdc
				.connect(addr1)
				.approve(auction1Address, cost);
			await approveTx.wait();
		}

		await auction1.connect(addr1).buy(amountToBuy);

		// Try to buy more tokens
		await expect(auction1.connect(addr1).buy(1)).to.be.revertedWith(
			"Not enough ZENO remaining"
		);
	});

	it("Should update the business address", async function () {});

	it("Should NOT allow to redeem ALL from ZENO bond before maturity date", async function () {
		await ethers.provider.send("evm_increaseTime", [3600 * 1.5]);
		await ethers.provider.send("evm_mine");

		const amountToBuy = 1;

		const price = await auction1.getPrice();
		const cost = parseFloat(price) * amountToBuy;

		// Buy ZENO bonds
		let allowance = await usdc.allowance(addr1.address, auction1Address);

		if (allowance < cost) {
			const approveTx = await usdc
				.connect(addr1)
				.approve(auction1Address, cost);
			await approveTx.wait();
		}

		await auction1.connect(addr1).buy(amountToBuy);

		expect(await zeno1.balanceOf(addr1.address)).to.equal(amountToBuy);

		// =====================
		await expect(
			zeno1.connect(addr1).redeemAll()
		).to.be.revertedWithCustomError(zeno1, "BondNotRedeemable");
	});

	it("Should allow the user to redeem a PARTICULAR amount of ZENO bonds", async function () {
		// Increase time to auctionStartTime
		await ethers.provider.send("evm_increaseTime", [3600 * 1.5]);
		await ethers.provider.send("evm_mine");

		const amountToBuy = 5;

		const initialUserUSDCAmount = await usdc.balanceOf(addr1.address);

		const price = await auction1.getPrice();
		const cost = parseFloat(price) * amountToBuy;

		// Buy ZENO bonds
		let allowance = await usdc.allowance(addr1.address, auction1Address);

		if (allowance < cost) {
			const approveTx = await usdc
				.connect(addr1)
				.approve(auction1Address, cost);
			await approveTx.wait();
		}

		await auction1.connect(addr1).buy(amountToBuy);

		expect(await zeno1.balanceOf(addr1.address)).to.equal(amountToBuy);

		const userUSDCAmountAfterBuy = await usdc.balanceOf(addr1.address);

		expect(userUSDCAmountAfterBuy).to.be.lessThan(initialUserUSDCAmount);

		// ========= TRANSFER FROM BUSINESS TO ZENO ============

		// Increase time to maturity date: one year
		await ethers.provider.send("evm_increaseTime", [86400 * 365 + 1]);
		await ethers.provider.send("evm_mine");

		// Redeem ZENO bonds
		const amountToRedeem = 3;
		const zenoBalanceAmount = 10; // amoutn of USDC in ZENO contract: to redeem

		// Approve the zeno contract
		allowance = await usdc.allowance(businessAddress, zeno1Address);

		if (allowance < zenoBalanceAmount) {
			const approveTx = await usdc
				.connect(businessAccount)
				.approve(zeno1Address, zenoBalanceAmount);
			await approveTx.wait();
		}

		// send money from business to zeno1
		await usdc
			.connect(businessAccount)
			.transfer(zeno1Address, zenoBalanceAmount);

		// check zeno1 received the money
		const zenoBalance = await usdc.balanceOf(zeno1Address);
		expect(zenoBalance).to.equal(zenoBalanceAmount);

		log(`addr1 balance before redeem: ${await usdc.balanceOf(addr1.address)}`);

		// ======== REDEEM ==========
		await zeno1.connect(addr1).redeem(amountToRedeem);

		log(`addr1 balance after redeem: ${await usdc.balanceOf(addr1.address)}`);

		const userUSDCAmountAfterRedeem = await usdc.balanceOf(addr1.address);

		// User balance should be between what they hade originally and what they spent
		expect(userUSDCAmountAfterRedeem).to.be.greaterThan(userUSDCAmountAfterBuy);
		expect(userUSDCAmountAfterRedeem).to.be.lessThan(initialUserUSDCAmount);

		// Balance of ZENo for addr1 is the totalAmountToBuy - amountToRedeem
		const userBalance = await zeno1.balanceOf(addr1.address);

		expect(userBalance).to.equal(amountToBuy - amountToRedeem);

		// Amount of USDC in ZENO contract
		expect(await usdc.balanceOf(zeno1Address)).to.equal(
			zenoBalanceAmount - amountToRedeem
		);
	});

	it("Should allow to redeem ALL from ZENO bond", async function () {
		// Increase time to auctionStartTime
		await ethers.provider.send("evm_increaseTime", [3600 * 1.5]);
		await ethers.provider.send("evm_mine");

		const amountToBuy = 1;

		const price = await auction1.getPrice();
		const cost = parseFloat(price) * amountToBuy;

		// Buy ZENO bonds
		let allowance = await usdc.allowance(addr1.address, auction1Address);

		if (allowance < cost) {
			const approveTx = await usdc
				.connect(addr1)
				.approve(auction1Address, cost);
			await approveTx.wait();
		}

		await auction1.connect(addr1).buy(amountToBuy);

		expect(await zeno1.balanceOf(addr1.address)).to.equal(amountToBuy);

		// =====================

		// Approve the auction contract

		// Increase time to maturity date: one year
		await ethers.provider.send("evm_increaseTime", [86400 * 365 + 1]);
		await ethers.provider.send("evm_mine");

		// Redeem ZENO bonds
		const amountToRedeem = 1;
		const zenoBalanceAmount = 20;

		// Approve the zeno contract
		allowance = await usdc.allowance(businessAddress, zeno1Address);

		if (allowance < zenoBalanceAmount) {
			const approveTx = await usdc
				.connect(businessAccount)
				.approve(zeno1Address, zenoBalanceAmount);
			await approveTx.wait();
		}

		// send money from business to zeno1
		await usdc
			.connect(businessAccount)
			.transfer(zeno1Address, zenoBalanceAmount);

		// check zeno1 received the money
		const zenoBalance = await usdc.balanceOf(zeno1Address);
		expect(zenoBalance).to.equal(zenoBalanceAmount);

		const addr1BalanceBeforeRedeem = await usdc.balanceOf(addr1.address);

		log(`addr1 balance before redeem ALL: ${addr1BalanceBeforeRedeem}`);

		await zeno1.connect(addr1).redeemAll();

		const addr1BalanceAfterRedeem = await usdc.balanceOf(addr1.address);

		log(`addr1 balance after redeem ALL: ${addr1BalanceAfterRedeem}`);

		// the user should have acquired all the USDC from the ZENO contract that they bought
		expect(addr1BalanceAfterRedeem).to.equal(
			Number(addr1BalanceBeforeRedeem) + Number(amountToBuy)
		);

		// Check the balance of the business account
		const businessBalance = await usdc.balanceOf(businessAddress);
		log(`Business Balance: ${businessBalance}`);

		// Check the balance of the user
		const userBalance = await zeno1.balanceOf(addr1.address);

		expect(userBalance).to.equal(0);
	});

	it("Should not allow to redeem more than the user has", async function () {
		// Increase time to auctionStartTime
		await ethers.provider.send("evm_increaseTime", [3600 * 1.5]);
		await ethers.provider.send("evm_mine");

		const amountToBuy = 5;

		const price = await auction1.getPrice();
		const cost = parseFloat(price) * amountToBuy;

		// Buy ZENO bonds
		let allowance = await usdc.allowance(addr1.address, auction1Address);

		if (allowance < cost) {
			const approveTx = await usdc
				.connect(addr1)
				.approve(auction1Address, cost);
			await approveTx.wait();
		}

		await auction1.connect(addr1).buy(amountToBuy);

		expect(await zeno1.balanceOf(addr1.address)).to.equal(amountToBuy);

		// ========= TRANSFER FROM BUSINESS TO ZENO ============

		// Increase time to maturity date: one year
		await ethers.provider.send("evm_increaseTime", [86400 * 365 + 1]);
		await ethers.provider.send("evm_mine");

		// Redeem ZENO bonds
		const amountToRedeem = 6;
		const zenoBalanceAmount = 10; // amoutn of USDC in ZENO contract: to redeem

		// Approve the zeno contract
		allowance = await usdc.allowance(businessAddress, zeno1Address);

		if (allowance < zenoBalanceAmount) {
			const approveTx = await usdc
				.connect(businessAccount)
				.approve(zeno1Address, zenoBalanceAmount);
			await approveTx.wait();
		}

		// send money from business to zeno1
		await usdc
			.connect(businessAccount)
			.transfer(zeno1Address, zenoBalanceAmount);

		// check zeno1 received the money
		const zenoBalance = await usdc.balanceOf(zeno1Address);
		expect(zenoBalance).to.equal(zenoBalanceAmount);

		log(`addr1 balance before redeem: ${await usdc.balanceOf(addr1.address)}`);

		// ======== REDEEM ==========
		await expect(
			zeno1.connect(addr1).redeem(amountToRedeem)
		).to.be.revertedWithCustomError(zeno1, "InsufficientBalance");
	});

	// Runs only at the end, finish of AUCTION
	it("Should not allow buying tokens after the auction ends", async function () {
		let amountToBuy = 1;

		// Increase time to auctionEndTime
		await ethers.provider.send("evm_increaseTime", [auctionEndTime]);

		await expect(auction1.connect(addr1).buy(amountToBuy)).to.be.revertedWith(
			"Auction ended"
		);
	});
});
