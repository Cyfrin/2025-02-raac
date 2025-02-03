import Deployer from '../primitives/Deployer.js';
import hre from 'hardhat';
const { ethers } = hre;
import {networks} from '../../chainlink_networks.js'

/**
 * Deploys the RAACHousePriceOracle contract.
 *
 * @param {Object} options - Deployment options.
 * @param {boolean} options.verify - Whether to verify the contract on Etherscan (default: false).
 * @returns {Promise<void>}
 */
async function deployRAACHousePriceOracle({ verify = false } = {}) {
  try {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const deployerInstance = new Deployer(hre, deployer);

    const functionsRouter = networks[network.name]["functionsRouter"];
    const donIdBytes32 = ethers.encodeBytes32String(networks[network.name]["donId"]);


    const housePriceFactory = await deployerInstance.deploy('RAACHousePrices', [deployer.address]);
    console.log(`RAACHousePrices deployed to: ${housePriceFactory.target}`);

    const houseOracleFactory = await deployerInstance.deploy('RAACHousePriceOracle', [functionsRouter, donIdBytes32, housePriceFactory.target]);
    console.log(`RAACHousePriceOracle deployed to: ${houseOracleFactory.target}`);

    // update the owneer of housePriceFactory to houseOracleFactory
    await housePriceFactory.transferOwnership(houseOracleFactory.target);
  } catch (error) {
    console.error("Error during contract deployment:", error);
  }
}

deployRAACHousePriceOracle()
  .then(() => console.log("Deployment complete."))
  .catch((error) => console.error("Deployment failed:", error));


