const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy RAAC Token
    const RAACToken = await ethers.getContractFactory("RAACToken");
    const raacToken = await RAACToken.deploy();
    await raacToken.deployed();
    console.log("RAACToken deployed to:", raacToken.address);

    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();
    await treasury.deployed();
    console.log("Treasury deployed to:", treasury.address);

    // Deploy FeeCollector
    const FeeCollector = await ethers.getContractFactory("FeeCollector");
    const feeCollector = await FeeCollector.deploy(treasury.address);
    await feeCollector.deployed();
    console.log("FeeCollector deployed to:", feeCollector.address);

    // Setup initial parameters
    await raacToken.setFeeCollector(feeCollector.address);
    await raacToken.setTaxRates(200, 50, 100); // 2% tax, 0.5% burn, 1% repair fund

    console.log("Initial parameters set");

    // Verify contracts
    if (process.env.ETHERSCAN_API_KEY) {
        await hre.run("verify:verify", {
            address: raacToken.address,
            constructorArguments: [],
        });
    }

    return {
        raacToken: raacToken.address,
        treasury: treasury.address,
        feeCollector: feeCollector.address,
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
