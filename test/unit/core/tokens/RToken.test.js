import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const WAD = ethers.parseEther("1");
const RAY = ethers.parseUnits("1", 27);

describe("RToken", function () {
    let RToken;
    let rToken;
    let owner;
    let reservePool;
    let user1;
    let user2;
    let addrs;
    let mockAsset;
    let mockLendingPool;

    beforeEach(async function () {
        [owner, reservePool, user1, user2, ...addrs] = await ethers.getSigners();

        // Deploy crvUSD token for underlying asset
        const CrvUSDToken = await ethers.getContractFactory("crvUSDToken");
        mockAsset = await CrvUSDToken.deploy(owner.address);
        await mockAsset.setMinter(owner.address);

        // Deploy mock LendingPool first
        const MockLendingPool = await ethers.getContractFactory("MockLendingPool");
        mockLendingPool = await MockLendingPool.deploy();
        
        // Deploy RToken
        RToken = await ethers.getContractFactory("RToken");
        rToken = await RToken.deploy("RToken", "RT", owner.address, mockAsset.target);

        // Set mock lending pool as reserve pool
        await rToken.setReservePool(mockLendingPool.target);
        await rToken.setMinter(reservePool.address);
        await rToken.setBurner(reservePool.address);

        // Mock the getNormalizedIncome function to return RAY (1e27)
        await mockLendingPool.mockGetNormalizedIncome(ethers.parseUnits("1", 27));

        // Mint some mockAsset to users for testing
        await mockAsset.mint(user1.address, ethers.parseEther("1000"));
        await mockAsset.mint(user2.address, ethers.parseEther("1000"));
        await mockAsset.mint(reservePool.address, ethers.parseEther("1000"));
        await mockAsset.connect(reservePool).approve(rToken.target, ethers.parseEther("1000"));
        await mockAsset.connect(user1).approve(rToken.target, ethers.parseEther("1000"));
        await mockAsset.connect(user2).approve(rToken.target, ethers.parseEther("1000"));
    });

    describe("Basic functionality", function() {
        beforeEach(async function() {
            // Set rToken in mock 
            await mockLendingPool.setRToken(rToken.target);
        });

        it("should allow minter (ReservePool) to mint RToken", async function () {
            const mintAmount = ethers.parseEther("100");
            const mintOnBehalfOf = user1.address;
            const index = RAY;

            await expect(mockLendingPool.mockMint(reservePool.address, mintOnBehalfOf, mintAmount, index))
                .to.emit(rToken, "Mint")
                .withArgs(reservePool.address, mintOnBehalfOf, mintAmount, index);

            const scaledBalance = await rToken.scaledBalanceOf(mintOnBehalfOf);
            expect(scaledBalance).to.equal(mintAmount);
        });

        it("should prevent non-minter from minting", async function () {
            const mintAmount = ethers.parseEther("100");
            const index = RAY;

            // Try to mint directly through rToken (will fail)
            await expect(
                rToken.connect(user1).mint(user1.address, user1.address, mintAmount, index)
            ).to.be.revertedWithCustomError(rToken, "OnlyReservePool");
        });

        it("should allow burner (ReservePool) to burn RToken", async function () {
            const mintAmount = ethers.parseEther("100");
            const index = RAY;

            //crvUSD minted to user1
            await mockLendingPool.mockMint(reservePool.address, user1.address, mintAmount, index);

            // crvUSD minted to the rToken contract
            await mockAsset.mint(rToken.target, mintAmount);

            await expect(mockLendingPool.mockBurn(user1.address, user1.address, mintAmount, index))
                .to.emit(rToken, "Burn")
                .withArgs(user1.address, user1.address, mintAmount, index);

            const scaledBalance = await rToken.scaledBalanceOf(user1.address);
            expect(scaledBalance).to.equal(0);
        });

        it("should prevent non-burner from burning", async function () {
            const mintAmount = ethers.parseEther("100");
            const index = RAY;

            //crvUSD minted to user1
            await mockLendingPool.mockMint(reservePool.address, user1.address, mintAmount, index);

            // Try to burn directly through rToken (should fail)
            await expect(
                rToken.connect(user1).burn(user1.address, user1.address, mintAmount, index)
            ).to.be.revertedWithCustomError(rToken, "OnlyReservePool");
        });

        it("should allow transfers between users", async function () {
            const mintAmount = ethers.parseEther("100");
            const index = RAY;

            //crvUSD minted to user1
            await mockLendingPool.mockMint(reservePool.address, user1.address, mintAmount, index);

            const transferAmount = ethers.parseEther("50");
            await expect(rToken.connect(user1).transfer(user2.address, transferAmount))
                .to.emit(rToken, "Transfer")
                .withArgs(user1.address, user2.address, transferAmount);

            const scaledBalanceUser1 = await rToken.scaledBalanceOf(user1.address);
            const scaledBalanceUser2 = await rToken.scaledBalanceOf(user2.address);

            expect(scaledBalanceUser1).to.equal(mintAmount - transferAmount);
            expect(scaledBalanceUser2).to.equal(transferAmount);
        });
    });

    describe("Role management", function() {
        it("should allow owner to set minter and burner", async function () {
            await rToken.setMinter(user1.address);
            await rToken.setBurner(user2.address);

            expect(await rToken._minter()).to.equal(user1.address);
            expect(await rToken._burner()).to.equal(user2.address);
        });

        it("should prevent non-owner from setting minter and burner", async function () {
            await expect(
                rToken.connect(user1).setMinter(user1.address)
            ).to.be.revertedWithCustomError(rToken, "OwnableUnauthorizedAccount");

            await expect(
                rToken.connect(user1).setBurner(user1.address)
            ).to.be.revertedWithCustomError(rToken, "OwnableUnauthorizedAccount");
        });
    });

    describe("Dust handling", function() {
        beforeEach(async function() {
            // Setup initial state for dust tests
            const initialMint = ethers.parseEther("100");
            const index = RAY;
            
            // Set rToken in mock 
            await mockLendingPool.setRToken(rToken.target);
            // Set normalized income to RAY (1e27) for dust tests
            await mockLendingPool.mockGetNormalizedIncome(RAY); 
            
            //crvUSD minted to user1
            await mockLendingPool.mockMint(reservePool.address, user1.address, initialMint, index);

            //crvUSD minted to the rToken contract
            await mockAsset.mint(rToken.target, initialMint);
        });

        it("should correctly calculate dust amount", async function() {
            const dustAmount = ethers.parseEther("1");
            // Mint extra amount to create dust
            await mockAsset.mint(rToken.target, dustAmount);
            
            // Contract has more assets than the total supply
            const calculatedDust = await rToken.calculateDustAmount();
            expect(calculatedDust).to.equal(dustAmount);
        });

        it("should allow reserve pool to transfer dust", async function() {
            const dustAmount = ethers.parseEther("1");
            await mockAsset.mint(rToken.target, dustAmount);

            const initialBalance = await mockAsset.balanceOf(user1.address);
            
            await expect(mockLendingPool.transferAccruedDust(user1.address, dustAmount))
                .to.emit(rToken, "DustTransferred")
                .withArgs(user1.address, dustAmount);
            
            const finalBalance = await mockAsset.balanceOf(user1.address);
            expect(finalBalance - initialBalance).to.equal(dustAmount);
        });

        it("should prevent non-reserve pool from transferring dust", async function() {
            const dustAmount = ethers.parseEther("1");
            await mockAsset.mint(rToken.target, dustAmount);

            await expect(
                rToken.connect(user1).transferAccruedDust(user2.address, dustAmount)
            ).to.be.revertedWithCustomError(rToken, "OnlyReservePool");
        });

        it("should revert when trying to transfer dust with zero balance", async function() {
            // Will revert with NoDust
            await expect(
                mockLendingPool.transferAccruedDust(user1.address, ethers.parseEther("1"))
            ).to.be.revertedWithCustomError(rToken, "NoDust");
        });
    });
});
