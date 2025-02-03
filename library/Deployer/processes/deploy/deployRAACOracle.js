import findContructorArg from "../../utils/findContructorArg.js";
import { ethers } from "ethers";

export async function deployRAACOracle(deployer, config, deployment) {
	const processResult = {
		timeStart: +new Date(),
	};
	deployer.logger.addLog("\x1b[36mDEPLOY_RAAC_ORACLE_START\x1b[0m", {
		config,
		timeStart: processResult.timeStart,
	});

	const wallet = deployment.getWallet();

	// Can be null if holesky
	const RAACOracleArgs = findContructorArg(
		deployment.constructorArgs["RAACHousePriceOracle"],
		deployment.contracts
	);


	// If either RAACOracleArgs is null, skip the deployment
	const canDeploy = RAACOracleArgs.reduce((acc, arg) => acc && arg !== null, true);
	
	if(canDeploy){
		// Release RAACHousePriceOracle
		if (!deployment.dependencies.RAACHousePriceOracle) {
			const RAACOracleArtifact = await deployer.readArtifactFile(
				"RAACHousePriceOracle"
			);
			const prepared = {
				contractName: "RAACHousePriceOracle",
				artifact: RAACOracleArtifact,
				originalArgs: RAACOracleArgs,
				// gasEstimate: deployment.estimatedCost.perContract['RAACHousePriceOracle'].minCost
			};

			console.log({prepared});
			const receipt = await deployer.deploy(
				prepared,
				wallet,
				deployment.contracts,
				deployment.signer.fee
			);
			deployment.contracts["RAACHousePriceOracle"] =
				receipt.receipt.contractAddress;
			deployment.dependencies.RAACHousePriceOracle = {
				address: receipt.receipt.contractAddress,
			};
		} else {
			deployment.contracts["RAACHousePriceOracle"] =
				deployment.dependencies.RAACHousePriceOracle.address;
		}

		// Release RAACPrimeRateOracle
		if (!deployment.dependencies.RAACPrimeRateOracle) {
			const RAACOracleArtifact = await deployer.readArtifactFile(
				"RAACPrimeRateOracle"
			);
			const RAACOracleArgs = findContructorArg(
				deployment.constructorArgs["RAACPrimeRateOracle"],
				deployment.contracts
			);

			// Can be null if holesky
			// if(RAACOracleArgs[1] !== null) {
			//     deployer.logger.addLog('\x1b[36mDEPLOY_RAAC_ORACLE_SKIPPED\x1b[0m');
			//     return deployment;
			// }
			const prepared = {
				contractName: "RAACPrimeRateOracle",
				artifact: RAACOracleArtifact,
				originalArgs: RAACOracleArgs,
				// gasEstimate: deployment.estimatedCost.perContract['RAACHousePriceOracle'].minCost
			};

			const receipt = await deployer.deploy(
				prepared,
				wallet,
				deployment.contracts,
				deployment.signer.fee
			);
			deployment.contracts["RAACPrimeRateOracle"] =
				receipt.receipt.contractAddress;
			deployment.dependencies.RAACPrimeRateOracle = {
				address: receipt.receipt.contractAddress,
			};
		} else {
			deployment.contracts["RAACPrimeRateOracle"] =
				deployment.dependencies.RAACPrimeRateOracle.address;
		}
	}

	if(!canDeploy){
		deployer.logger.addLog('\x1b[36mDEPLOY_RAAC_ORACLE_SKIPPED\x1b[0m');
		deployer.logger.addLog('Missing ROUTER address for RAACHousePriceOracle Chainlink contract');
		deployer.logger.addLog('This is probably due to the network not being supported by Chainlink.');
	};

	processResult.logger = deployer.logger.export();
	processResult.timeEnd = +new Date();
	processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

	deployment.processes.deployRAACOracle = processResult;
	return deployment;
}
