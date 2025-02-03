const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Setting up parameters with account:", deployer.address);

    // Get deployed contract addresses
    const raacTokenAddress = process.env.RAAC_TOKEN_ADDRESS;
    const veRAACTokenAddress = process.env.VERAAC_TOKEN_ADDRESS;
    const feeCollectorAddress = process.env.FEE_COLLECTOR_ADDRESS;
    const treasuryAddress = process.env.TREASURY_ADDRESS;

    if (!raacTokenAddress || !veRAACTokenAddress || !feeCollectorAddress || !treasuryAddress) {
        throw new Error("Required addresses not set in environment");
    }

    // Attach to contracts
    const RAACToken = await ethers.getContractFactory("RAACToken");
    const raacToken = RAACToken.attach(raacTokenAddress);

    // Set up initial parameters
    console.log("Setting up initial parameters...");

    // Set tax rates
    await raacToken.setTaxRates(
        200, // 2% swap tax
        50,  // 0.5% burn tax
        100  // 1% repair fund
    );
    console.log("Tax rates set");

    // Set fee collector
    await raacToken.setFeeCollector(feeCollectorAddress);
    console.log("Fee collector set");

    // Set up whitelist
    const whitelistAddresses = [
        veRAACTokenAddress,
        feeCollectorAddress,
        treasuryAddress
    ];

    for (const address of whitelistAddresses) {
        await raacToken.addToWhitelist(address);
        console.log(`Whitelisted: ${address}`);
    }

    // Verify parameters
    console.log("\nVerifying parameters:");
    console.log("Swap tax rate:", await raacToken.swapTaxRate());
    console.log("Burn tax rate:", await raacToken.burnTaxRate());
    console.log("Fee collector:", await raacToken.feeCollector());

    return {
        raacToken: raacTokenAddress,
        veRAACToken: veRAACTokenAddress,
        feeCollector: feeCollectorAddress,
        treasury: treasuryAddress
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
