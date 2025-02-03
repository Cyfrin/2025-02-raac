import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Treasury", () => {
    let treasury;
    let token;
    let owner;
    let user1;
    let user2;
    let manager;
    let allocator;

    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
    const ALLOCATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ALLOCATOR_ROLE"));

    beforeEach(async () => {
        [owner, user1, user2, manager, allocator] = await ethers.getSigners();

        // Deploy mock token using pattern from MockToken.sol
        const MockToken = await ethers.getContractFactory("MockToken");
        token = await MockToken.deploy("Test Token", "TEST", 18);
        await token.mint(user1.address, ethers.parseEther("1000"));
        await token.mint(user2.address, ethers.parseEther("1000"));

        // Deploy Treasury
        const Treasury = await ethers.getContractFactory("Treasury");
        treasury = await Treasury.deploy(owner.address);

        // Setup roles
        await treasury.grantRole(MANAGER_ROLE, manager.address);
        await treasury.grantRole(ALLOCATOR_ROLE, allocator.address);
    });

    describe("Access Control", () => {
        it("should set correct roles on deployment", async () => {
            expect(await treasury.hasRole(MANAGER_ROLE, manager.address)).to.be.true;
            expect(await treasury.hasRole(ALLOCATOR_ROLE, allocator.address)).to.be.true;
        });

        it("should prevent unauthorized withdrawals", async () => {
            await expect(
                treasury.connect(user1).withdraw(token.getAddress(), 100, user2.address)
            ).to.be.revertedWithCustomError(treasury, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Deposits", () => {
        beforeEach(async () => {
            await token.connect(user1).approve(treasury.getAddress(), ethers.parseEther("1000"));
        });

        it("should accept deposits and update balances", async () => {
            const amount = ethers.parseEther("100");
            await treasury.connect(user1).deposit(token.getAddress(), amount);
            
            expect(await treasury.getBalance(token.getAddress())).to.equal(amount);
            expect(await treasury.getTotalValue()).to.equal(amount);
        });

        it("should emit Deposited event", async () => {
            const amount = ethers.parseEther("100");
            await expect(treasury.connect(user1).deposit(token.getAddress(), amount))
                .to.emit(treasury, "Deposited")
                .withArgs(token.getAddress(), amount);
        });
    });

    describe("Withdrawals", () => {
        beforeEach(async () => {
            await token.connect(user1).approve(treasury.getAddress(), ethers.parseEther("1000"));
            await treasury.connect(user1).deposit(token.getAddress(), ethers.parseEther("100"));
        });

        it("should allow manager to withdraw", async () => {
            const amount = ethers.parseEther("50");
            const initialBalance = await token.balanceOf(user2.address);
            
            await treasury.connect(manager).withdraw(token.getAddress(), amount, user2.address);
            
            const finalBalance = await token.balanceOf(user2.address);
            expect(finalBalance - initialBalance).to.equal(amount);
        });

        it("should update balances after withdrawal", async () => {
            const amount = ethers.parseEther("50");
            await treasury.connect(manager).withdraw(token.getAddress(), amount, user2.address);
            
            expect(await treasury.getBalance(token.getAddress())).to.equal(
                ethers.parseEther("50")
            );
        });
    });

    describe("Fund Allocation", () => {
        it("should allow allocator to allocate funds", async () => {
            const amount = ethers.parseEther("100");
            await treasury.connect(allocator).allocateFunds(user1.address, amount);
            
            expect(await treasury.getAllocation(allocator.address, user1.address))
                .to.equal(amount);
        });

        it("should emit FundsAllocated event", async () => {
            const amount = ethers.parseEther("100");
            await expect(treasury.connect(allocator).allocateFunds(user1.address, amount))
                .to.emit(treasury, "FundsAllocated")
                .withArgs(user1.address, amount);
        });
    });
});