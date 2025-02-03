import { ethers } from 'ethers';
import chalk from 'chalk';
import { estimateContractCost } from '../../utils/estimateContractCost.js';

export async function prepareContracts(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };

    // If we have no crvusd set, then we need to deploy one.
    await deployer.logger.addLog('\x1b[36mPREPARE_CONTRACTS_START\x1b[0m', { config });

    if(!config.contracts) throw new Error('No contracts to prepare');

    const contracts = config.contracts;
    const contractsArtifacts = {};
    for(const contract of contracts) {
        await deployer.logger.addLog('PREPARE_CONTRACTS_LOADING', { contract });
        const contractArtifact = await deployer.getContractArtifact(contract);
        if(!contractArtifact) throw new Error(`Contract artifact not found for ${contract}`);
        contractsArtifacts[contract] = contractArtifact;
        deployer.logger.addLog('\x1b[32mCONTRACT_ARTIFACT_VALID\x1b[0m', { contract });
    }

    setTimeout(() => {
        console.log('emit confirmation for now - to be removed before release');
        deployer.emit(deployer.DEPLOYER_EVENTS.CONFIRMATION_RECEIVED, { confirmed: true });
    }, 100);


    // Verify that we actually can deploy the contracts
    const currentAddress = deployment.getWallet().address;
    if(currentAddress !== deployment.signer.address) {
        throw new Error(`Wallet address mismatch: ${currentAddress} !== ${deployment.signer.address}`);
    }
    const currentBalance = await deployment.provider.getBalance(currentAddress);
    const currentBalanceInEth = ethers.formatEther(currentBalance);
    const feeData = await deployment.provider.getFeeData();

    deployer.logger.addLog('CHECKING_BALANCE', {
        address: currentAddress,
        balance: currentBalanceInEth
    });


    deployment.signer = {
        address: currentAddress,
        balance: currentBalanceInEth,
        fee: {
            gasPrice: feeData.gasPrice,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        }
    };

    deployment.estimatedCost = {
        totalMax: 0n,
        totalMin: 0n,
        perContract: {}
    };
     // Estimate total gas needed for deployment
     deployer.logger.addLog('\x1b[36mEstimating gas...\x1b[0m', 'Estimating gas...');
     for(const contract of contracts) {
        const contractArtifact = contractsArtifacts[contract];
        const constructorArgs = deployment.constructorArgs[contract];
        const estimatedCost = await estimateContractCost(contractArtifact, deployment.provider, constructorArgs, deployment.signer.fee);
        const { minCost, maxCost } = estimatedCost;

        deployment.estimatedCost.totalMax += maxCost;
        deployment.estimatedCost.totalMin += minCost;
        deployment.estimatedCost.perContract[contract] = estimatedCost;
     }

     deployment.estimatedCost.totalMaxInEth = ethers.formatEther(deployment.estimatedCost.totalMax);
     deployment.estimatedCost.totalMinInEth = ethers.formatEther(deployment.estimatedCost.totalMin);

     if(deployment.estimatedCost.totalMaxInEth > deployment.signer.balance) {
        throw new Error(`Insufficient balance for deployment.\n` +
        `Required: ${deployment.estimatedCost.totalMaxInEth} ETH\n` +
        `Available: ${deployment.signer.balance} ETH`);
     }
     deployer.logger.addLog(
        '\x1b[32mESTIMATED_COST_CHECK_SUCCESS\x1b[0m',
        `Estimated max cost: ${deployment.estimatedCost.totalMaxInEth} ETH | Current balance: ${deployment.signer.balance} ETH`);


    setTimeout(() => {
        console.log('\x1b[35m /!\\ REMOVE ME BEFORE RELEASE\x1b[0m');
        deployer.emit(deployer.DEPLOYER_EVENTS.CONFIRMATION_RECEIVED, { confirmed: true });
    }, 100);
    // Request confirmation
    const confirmed = await deployer.requireConfirmation(
        'Contract preparation complete. Continue with deployment?',
        Object.keys(contractsArtifacts)
    );

    if (!confirmed) {
        throw new Error('Deployment cancelled by user after contract preparation');
    }

    deployer.logger.addLog('\x1b[32mPREPARE_CONTRACTS_SUCCESS\x1b[0m', Object.keys(contractsArtifacts));
    processResult.artifacts = contractsArtifacts;


    processResult.timings = {
        timeStart: processResult.timeStart,
        timeEnd: processResult.timeEnd,
        timeTaken: processResult.timeTaken
    };


    deployer.logger.addLog('\x1b[32mPREPARE_CONTRACTS_SUCCESS\x1b[0m', `${JSON.stringify({timings:processResult.timings, artifacts:Object.keys(processResult.artifacts)}, { depth: null })}`);
    processResult.logger = deployer.logger.export();
    deployment.processes.prepareContracts = processResult;
    deployment.artifacts = Object.keys(processResult.artifacts);
    return deployment;
} 