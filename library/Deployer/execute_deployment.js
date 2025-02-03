import Deployer from "./Deployer.js";

import exportDeployment from './utils/exportDeployment.js';
import stringifyDeployment from './utils/stringifyDeployment.js';
import runProcessesSequence from './utils/runProcessesSequence.js';
import prepareConstructorArgs from './utils/prepareConstructorArgs.js';

// Configs (modifiable)
import prepareEnvironmentConfig from './configs/prepareEnvironment.js';
import prepareContractsConfig from './configs/prepareContracts.js';
import deployContractsConfig from './configs/deployContracts.js';
import deployTokenConfig from './configs/deployToken.js';
import dependenciesConfig from './configs/dependencies.js';
import prepareTGEConfig from './configs/prepareTGE.js';

async function main() {
	console.log('Starting deployment...');
	console.log(prepareTGEConfig);
	const deployer = new Deployer();

	// TGE config
	if(!prepareTGEConfig || !prepareTGEConfig.tgeConfig || !prepareTGEConfig.tgeConfig.wallets || !prepareTGEConfig.tgeConfig.initialSupply || !prepareTGEConfig.tgeConfig.owner) {
		throw new Error('TGE config is missing');
	}

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

	if (process.argv.includes("--logs")) {
		deployer.logger.on("ADD_LOG", (log) => {
			console.log(
				`[${log.type} - ${log.timestamp}] - ${JSON.stringify(log.data)}`
			);
		});
	}



	throw new Error('Not implemented');
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

main();