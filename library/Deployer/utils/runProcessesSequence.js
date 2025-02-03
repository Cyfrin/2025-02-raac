import { ethers } from "ethers";
import { processes } from "../processes/index.js";

export default async function runProcessesSequence(deployment, deployer, configs) {
		for (const _process of processes) {
			if (!_process.active) {
				console.log(
					`\x1b[33m==== ${_process.name} - ${_process.description} ====\x1b[0m`
				);
				console.log(`\x1b[33m==== ${_process.name} - Skipped ====\x1b[0m`);
				deployment.processes[_process.id] = {
					skipped: true,
					logger: deployer.logger.export(),
				};
				continue;
			}
			const config = configs[_process.id];
			try {
				deployment = await _process.handler(deployer, config, deployment);
				console.log(
					`\x1b[32m==== ${_process.name} - Done : ${_process.id} ====\x1b[0m`
				);
			} catch (error) {
				console.log(
					`\x1b[31m==== ${_process.name} - Failed : ${_process.id} ====\x1b[0m`
				);
				console.log(error);
				// Try to get the contract by the address
				// Find the contract in the deployment.contracts
				if (error?.transaction?.to) {
					const [contractName, contractAddress] = Object.entries(
						deployment.contracts
					).find(([_, address]) => address === error.transaction.to);
					try {
						const contractArtifact = await deployer.readArtifactFile(
							contractName
						);
						const contract = new ethers.Contract(
							contractAddress,
							contractArtifact.abi,
							deployment.getWallet()
						);
						if (contract) {
							console.log(
								`Parsing error for ${contractName} at ${contractAddress}`
							);
							const parsedError = contract.interface.parseError(error.message);
							console.log(parsedError);
						}
					} catch (parsingError) {
						// Log the error but don't throw it - we will throw the base error later
						console.log({ parsingError });
					}
				}
				throw error;
			}
		}
	}