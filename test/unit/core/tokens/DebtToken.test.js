import { expect } from "chai";
import hre from "hardhat";
const { ethers, network } = hre;

describe("DebtToken", function () {
    this.timeout(50000); // Increase timeout to 50 seconds

    let DebtToken;
    let debtToken;
    let owner;
    let user1;
    let user2;
    let addrs;
    let MockLendingPool;
    let mockLendingPool;
    let mockLendingPoolSigner;
    const RAY = ethers.getBigInt("1000000000000000000000000000"); // 1e27

    beforeEach(async function () {
        [owner, user1, user2, ...addrs] = await ethers.getSigners();

        // Deploy mock lending pool first
        const MockLendingPoolFactory = await ethers.getContractFactory("MockLendingPoolDebtToken", owner);
        mockLendingPool = await MockLendingPoolFactory.deploy();
        await mockLendingPool.waitForDeployment();
        const mockLendingPoolAddress = await mockLendingPool.getAddress();

        // Set up mock lending pool
        await mockLendingPool.setNormalizedDebt(RAY); // Set initial normalized debt to 1

        // Deploy DebtToken
        const DebtTokenFactory = await ethers.getContractFactory("DebtToken", owner);
        debtToken = await DebtTokenFactory.deploy("DebtToken", "DT", owner.address);
        await debtToken.waitForDeployment();
        const debtTokenAddress = await debtToken.getAddress();

        // Set up DebtToken
        await debtToken.setReservePool(mockLendingPoolAddress);

        // Set up mock lending pool signer with enough ETH
        mockLendingPoolSigner = await ethers.getImpersonatedSigner(mockLendingPoolAddress);
        await owner.sendTransaction({
            to: mockLendingPoolAddress,
            value: ethers.parseEther("10.0") // Increase to 10 ETH
        });

        // Set gas limit for impersonated signer
        await network.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
        await network.provider.send("hardhat_setBalance", [
            mockLendingPoolAddress,
            "0x56BC75E2D63100000" // 100 ETH
        ]);
    });

    it("should allow ReservePool to mint debt tokens", async function () {
        const mintAmount = ethers.parseEther("100");
        const index = RAY; // Initial index

        console.log("Attempting to mint", mintAmount.toString(), "tokens with index", index.toString());
        const tx = await debtToken.connect(mockLendingPoolSigner).mint(user1.address, user1.address, mintAmount, index);
        const receipt = await tx.wait();
        console.log("Mint transaction successful, gas used:", receipt.gasUsed.toString());

        const balance = await debtToken.balanceOf(user1.address);
        console.log("User balance after mint:", balance.toString());
        expect(balance).to.equal(mintAmount);
    });

    it("should prevent non-ReservePool from minting", async function () {
        const mintAmount = ethers.parseEther("100");
        const index = RAY;

        await expect(
            debtToken.connect(user1).mint(user1.address, user1.address, mintAmount, index)
        ).to.be.revertedWithCustomError(debtToken, "OnlyReservePool");
    });

    it("should allow ReservePool to burn debt tokens", async function () {
        const mintAmount = ethers.parseEther("100");
        const index = RAY;

        console.log("Minting tokens before burn test");
        await debtToken.connect(mockLendingPoolSigner).mint(user1.address, user1.address, mintAmount, index);
        
        console.log("Attempting to burn tokens");
        await debtToken.connect(mockLendingPoolSigner).burn(user1.address, mintAmount, index);

        const balance = await debtToken.balanceOf(user1.address);
        console.log("Balance after burn:", balance.toString());
        expect(balance).to.equal(0n);
    });

    it("should prevent non-ReservePool from burning", async function () {
        const mintAmount = ethers.parseEther("100");
        const index = RAY;

        await debtToken.connect(mockLendingPoolSigner).mint(user1.address, user1.address, mintAmount, index);

        await expect(
            debtToken.connect(user1).burn(user1.address, mintAmount, index)
        ).to.be.revertedWithCustomError(debtToken, "OnlyReservePool");
    });

    it("should prevent transfers via transfer method", async function () {
        const mintAmount = ethers.parseEther("100");
        const index = RAY;

        await debtToken.connect(mockLendingPoolSigner).mint(user1.address, user1.address, mintAmount, index);

        await expect(
            debtToken.connect(user1).transfer(user2.address, mintAmount)
        ).to.be.revertedWithCustomError(debtToken, "TransfersNotAllowed");
    });

    it("should prevent transfers via transferFrom method", async function () {
        const mintAmount = ethers.parseEther("100");
        const index = RAY;

        await debtToken.connect(mockLendingPoolSigner).mint(user1.address, user1.address, mintAmount, index);
        await debtToken.connect(user1).approve(user2.address, mintAmount);

        await expect(
            debtToken.connect(user2).transferFrom(user1.address, user2.address, mintAmount)
        ).to.be.revertedWithCustomError(debtToken, "TransfersNotAllowed");
    });

    it("should reflect accrued interest in user balance", async function () {
        const mintAmount = ethers.parseEther("100");
        const initialIndex = RAY;
        const newIndex = RAY * 11n / 10n; // 1.1 RAY = 10% increase

        console.log("Minting tokens for interest test");
        await debtToken.connect(mockLendingPoolSigner).mint(user1.address, user1.address, mintAmount, initialIndex);
        
        console.log("Setting new normalized debt");
        await mockLendingPool.setNormalizedDebt(newIndex);

        const balance = await debtToken.balanceOf(user1.address);
        const expectedBalance = mintAmount * newIndex / RAY;
        console.log("Balance after interest:", balance.toString());
        console.log("Expected balance:", expectedBalance.toString());
        expect(balance).to.equal(expectedBalance);
    });

    it("should prevent index from decreasing", async function () {
        const initialIndex = RAY * 11n / 10n; // 1.1 RAY
        const lowerIndex = RAY; // 1.0 RAY

        console.log("Setting initial usage index");
        await debtToken.connect(mockLendingPoolSigner).updateUsageIndex(initialIndex);

        console.log("Attempting to decrease index");
        await expect(
            debtToken.connect(mockLendingPoolSigner).updateUsageIndex(lowerIndex)
        ).to.be.revertedWithCustomError(debtToken, "InvalidAmount");
    });
});
