import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
describe("LiquidationLibrary", function () {
    let ReservePool;
    let reservePool;
    let RAACHousePricesMock;
    let housePricesMock;
    let RAACForclosureLaneMock;
    let foreclosureLaneMock;
    let RAACVault;
    let vault;
    let owner;
    let borrower;
    let liquidator;
    let crvUSD;
    let rcrvUSD;
    const tokenId = 1;
    const initialCollateralValue = ethers.parseEther("100"); // $100
    const borrowAmount = ethers.parseEther("80"); // $80

    beforeEach(async function () {
        [owner, borrower, liquidator, ...addrs] = await ethers.getSigners();

        // Deploy mocks for IRAACHousePrices and IRAACForclosureLane
        const HousePricesMock = await ethers.getContractFactory("RAACHousePricesMock");
        housePricesMock = await HousePricesMock.deploy();
        await housePricesMock.deployed();

        const ForclosureLaneMock = await ethers.getContractFactory("RAACForclosureLaneMock");
        foreclosureLaneMock = await ForclosureLaneMock.deploy();
        await foreclosureLaneMock.deployed();

        // Deploy mock tokens
        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        crvUSD = await ERC20Mock.deploy("Curve USD", "crvUSD");
        await crvUSD.deployed();

        const ERC20Mock2 = await ethers.getContractFactory("ERC20Mock");
        rcrvUSD = await ERC20Mock2.deploy("Interest-bearing crvUSD", "rcrvUSD");
        await rcrvUSD.deployed();

        const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
        nft = await ERC721Mock.deploy("Test NFT", "TNFT");
        await nft.deployed();

        // Mint NFT to borrower
        await nft.mint(borrower.address, tokenId);

        // Deploy the ReservePool contract
        const ReservePoolFactory = await ethers.getContractFactory("ReservePool");
        reservePool = await ReservePoolFactory.deploy(
            crvUSD.address,
            rcrvUSD.address,
            nft.address,
            housePricesMock.address,
            foreclosureLaneMock.address
        );
        await reservePool.deployed();

        // Mint crvUSD to liquidator
        await crvUSD.mint(liquidator.address, ethers.parseEther("1000"));
        await crvUSD.connect(liquidator).approve(reservePool.address, ethers.parseEther("1000"));

        // Borrower creates a vault
        await reservePool.connect(borrower).createVault();
        const vaultAddress = await reservePool.userVaults(borrower.address);

        // Borrower approves NFT to vault and deposits NFT
        await nft.connect(borrower).approve(vaultAddress, tokenId);
        vault = await ethers.getContractAt("RAACVault", vaultAddress);
        await vault.connect(borrower).depositNFT(tokenId);

        // Set initial house price
        await housePricesMock.setTokenPrice(tokenId, initialCollateralValue);

        // Borrower borrows
        await reservePool.connect(borrower).borrow(borrowAmount);
    });

    it("Should allow liquidation when health factor is below 1", async function () {
        // Decrease collateral value to trigger liquidation
        await housePricesMock.setTokenPrice(tokenId, ethers.parseEther("60"));

        // Liquidator performs liquidation
        await expect(reservePool.connect(liquidator).liquidate(vault.address))
            .to.emit(reservePool, "Liquidation")
            .withArgs(vault.address, borrower.address, borrowAmount);

        // Check that loan is updated
        const loanData = await reservePool.getLoanData(vault.address);
        expect(loanData.borrowedAmount).to.equal(0);
        expect(loanData.isActive).to.be.false;

        // Check NFT ownership
        expect(await nft.ownerOf(tokenId)).to.equal(foreclosureLaneMock.address);
    });

    it("Should not allow liquidation when health factor is sufficient", async function () {
        // Collateral value remains the same
        await expect(reservePool.connect(liquidator).liquidate(vault.address))
            .to.be.revertedWith("Loan health factor is sufficient");
    });
});
