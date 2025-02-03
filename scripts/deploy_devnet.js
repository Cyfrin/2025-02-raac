import hre from 'hardhat';
const { ethers } = hre;
import Deployer from '../library/Deployer/Deployer.js';

import prepareEnvironmentConfig from './../library/Deployer/configs/prepareEnvironment.js';
import prepareContractsConfig from './../library/Deployer/configs/prepareContracts.js';
import deployContractsConfig from './../library/Deployer/configs/deployContracts.js';
import deployTokenConfig from './../library/Deployer/configs/deployToken.js';
import dependenciesConfig from './../library/Deployer/configs/dependencies.js';
import prepareTGEConfig from './../library/Deployer/configs/prepareTGE.js';

import exportDeployment from './../library/Deployer/utils/exportDeployment.js';
import stringifyDeployment from './../library/Deployer/utils/stringifyDeployment.js';
import runProcessesSequence from './../library/Deployer/utils/runProcessesSequence.js';
import prepareConstructorArgs from './../library/Deployer/utils/prepareConstructorArgs.js';


async function main() {
    // Check if the local node is running
    try {
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        await provider.getNetwork();
    } catch (error) {
        console.error('\x1b[31mError: Local node not detected!\x1b[0m');
        console.log('\x1b[33mPlease start the local node first by running:\x1b[0m');
        console.log('\x1b[36mnpm run node\x1b[0m');
        process.exit(1);
    }

    console.log('\x1b[32mLocal node detected, proceeding with deployment...\x1b[0m');

    console.log('Starting deployment...');
	const deployer = new Deployer();


	const deployerAddress = prepareTGEConfig.tgeConfig.owner;
	const faucetAddress = prepareTGEConfig.tgeConfig.faucet;

	// Prepare environment
	const configs = {
		prepareEnvironment: prepareEnvironmentConfig,
		prepareContracts: prepareContractsConfig,
		prepareTGE: prepareTGEConfig,
		deployToken: deployTokenConfig,
		deployContracts: deployContractsConfig,
	};

    console.log('Deployer logger initialized');
  
    deployer.logger.on("ADD_LOG", (log) => {
        console.log(
            `[${log.type} - ${log.timestamp}] - ${JSON.stringify(log.data)}`
        );
    });

    let deployment = {
		id: new Date().getTime().toString(16),
		network: prepareEnvironmentConfig.network,
		// Dependencies in form [contractName: {address: string}]
		// When dependencies is set, the deployer will properly use it (as if deployed).
		dependencies: dependenciesConfig,
		constructorArgs: prepareConstructorArgs(deployerAddress),
		faucet: { address: faucetAddress },
		processes: {},
		contracts: {},
		config: configs["prepareEnvironment"],
		estimatedCost: {
			totalMax: 0n,
			totalMin: 0n,
			perContract: {},
		},
		signer: {
			address: deployerAddress,
			balance: 0n,
			fee: {
				gasPrice: 0n,
				maxFeePerGas: 0n,
				maxPriorityFeePerGas: 0n,
			},
		},
		provider: null,
		getWallet: null,
	};

    // Run processes
	await runProcessesSequence(deployment, deployer, configs);

	// console.log('\x1b[32m==== Deployment Complete ====\x1b[0m');
	const exportableDeployment = exportDeployment(deployment);
	delete exportableDeployment.logs;

	console.log(stringifyDeployment(deployment));
	process.exit(0);


}

main()
  .then(() => {
    console.log('All operations completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });