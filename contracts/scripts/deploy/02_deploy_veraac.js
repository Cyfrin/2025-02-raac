const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying veRAACToken with account:", deployer.address);

    // Get RAAC Token address from previous deployment
    const raacTokenAddress = process.env.RAAC_TOKEN_ADDRESS;
    if (!raacTokenAddress) {
        throw new Error("RAAC_TOKEN_ADDRESS not set");
    }

    // Deploy veRAACToken
    const VeRAACToken = await ethers.getContractFactory("veRAACToken");
    const veRAACToken = await VeRAACToken.deploy(raacTokenAddress);
    await veRAACToken.deployed();
    console.log("veRAACToken deployed to:", veRAACToken.address);

    // Setup veRAACToken in RAAC Token
    const RAACToken = await ethers.getContractFactory("RAACToken");
    const raacToken = RAACToken.attach(raacTokenAddress);
    await raacToken.setVeRAACToken(veRAACToken.address);

    console.log("veRAACToken setup complete");

    // Verify contract
    if (process.env.ETHERSCAN_API_KEY) {
        await hre.run("verify:verify", {
            address: veRAACToken.address,
            constructorArguments: [raacTokenAddress],
        });
    }

    return {
        veRAACToken: veRAACToken.address,
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
