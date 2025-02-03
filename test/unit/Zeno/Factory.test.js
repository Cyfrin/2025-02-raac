import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const canLog = false;
const log = (msg, ...optional) =>
	canLog ? console.log(msg, ...optional) : null;

/**
 * Test only the Factory contract to create new auctions and ZENOs
 */
describe("Test creation of Auctions and ZENOs with Factories", function () {
	let auctionFactory, zenoFactory, usdc;

	let auctionFactoryAddress, zenoFactoryAddress, usdcAddress;

	let owner, addr1, addr2;
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
		usdc = await ethers.deployContract("MockUSDC", [initialSupply]);
		await usdc.waitForDeployment();
		usdcAddress = await usdc.getAddress();
		log("USDC Address:", usdcAddress);

		// Deploy Auction Factory
		const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
		auctionFactory = await ethers.deployContract("AuctionFactory", [
			owner.address,
		]);
		await auctionFactory.waitForDeployment();
		auctionFactoryAddress = await auctionFactory.getAddress();
		log("Auction Factory Address:", auctionFactoryAddress);

		// Deploy ZENO Factory
		const ZENOFactory = await ethers.getContractFactory("ZENOFactory");
		zenoFactory = await ethers.deployContract("ZENOFactory", [owner.address]);
		await zenoFactory.waitForDeployment();
		zenoFactoryAddress = await zenoFactory.getAddress();
		log("ZENO Factory Address:", zenoFactoryAddress);
	});

	// Factory testings
	it("Should initialize the AuctionFactory correctly", async function () {
		expect(await auctionFactory.owner()).to.equal(owner.address);
		expect(await auctionFactory.getAuctionCount()).to.equal(0);
	});
	it("Should initialize the ZENOFactory correctly", async function () {
		expect(await zenoFactory.owner()).to.equal(owner.address);
		expect(await zenoFactory.getZENOCount()).to.equal(0);
	});
	it("Should create a new ZENO Contract", async function () {
		const maturityDate = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year later

		// Deploy a new ZENO Contract for Auction
		await zenoFactory.createZENOContract(usdcAddress, maturityDate);

		expect(await zenoFactory.getZENOCount()).to.equal(1);

		const zeno1Address = await zenoFactory.getZENO(0);

		const zeno1 = await ethers.getContractAt("ZENO", zeno1Address);
		expect(await zeno1.owner()).to.equal(zenoFactoryAddress);
		expect(await zeno1.USDC()).to.equal(usdcAddress);
		expect(await zeno1.MATURITY_DATE()).to.equal(maturityDate);

		const zenoName = await zeno1.name();
		expect(zenoName).to.equal("ZENO Bond 1");
		const zenoSymbol = await zeno1.symbol();
		expect(zenoSymbol).to.equal("ZENO1");
	});
	it("Should allow creating a new entire auction", async function () {
		const maturityDate = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year later

		// Deploy a new ZENO Contract for Auction
		await zenoFactory.createZENOContract(usdcAddress, maturityDate);

		expect(await zenoFactory.getZENOCount()).to.equal(1);

		// Get the address of the ZENO contract
		const zeno1Address = await zenoFactory.getZENO(0);

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
		const auction1Address = await auctionFactory.getAuction(0);

		// Check the auction details
		expect(await auctionFactory.getAuctionCount()).to.equal(1);

		const auction = await ethers.getContractAt("Auction", auction1Address);
		expect(await auction.owner()).to.equal(auctionFactoryAddress);
		expect(await auction.zeno()).to.equal(zeno1Address);
		expect(await auction.usdc()).to.equal(usdcAddress);
		expect(await auction.businessAddress()).to.equal(businessAddress);
		expect(await auction.auctionStartTime()).to.equal(auctionStartTime);
		expect(await auction.auctionEndTime()).to.equal(auctionEndTime);
		expect(await auction.startingPrice()).to.equal(startingPrice);
		expect(await auction.reservePrice()).to.equal(reservePrice);
		expect(await auction.totalZENOAllocated()).to.equal(totalZENOAllocated);
		expect(await auction.totalZENORemaining()).to.equal(totalZENORemaining);

		// Change the owner of the zeno1 contract to the auction contract
		await zenoFactory.transferZenoOwnership(0, auction1Address);
		const zeno1 = await ethers.getContractAt("ZENO", zeno1Address);
		expect(await zeno1.owner()).to.equal(auction1Address);
	});
});
