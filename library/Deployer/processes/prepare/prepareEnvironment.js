import { ethers } from 'ethers';
import { prepareContracts } from './prepareContracts.js';
import findContructorArg  from "../../utils/findContructorArg.js";

export async function prepareEnvironment(deployer, config, deployment) {
    await deployer.logger.addLog('\x1b[36mPREPARE_ENV_START\x1b[0m', `deployementId: ${deployment.id}`);
  
    let networkName = deployment?.network || process.env.NETWORK;
    if(!networkName) throw new Error('Missing network configuration');

    const network = await deployer.readNetworkFile(networkName);
    deployer.setNetwork(network);

    await deployer.logger.addLog('CONFIG_NETWORK', { ...network });
    await deployer.logger.addLog('CONFIG_CONTRACTS', { contracts: config.contracts });
    await deployer.logger.addLog('CONFIG_SETTINGS', { settings: config.settings });

    const processResult = {
        timeStart: +new Date(),
    };

    // Get mnemonic from user
    setTimeout(() => {
        console.log('emit mnemonic from env for now - to be removed before release');
        const mnemonic = process.env.MNEMONIC;
        if(!mnemonic) throw new Error('MNEMONIC is not set');
        deployer.emit(deployer.DEPLOYER_EVENTS.INPUT_RECEIVED, {input: mnemonic});
    }, 100);


    const userInputMnemonic = await deployer.requireInput('Enter deployment wallet mnemonic:', 'text');
    // Ideally we should check if the mnemonic is valid - but let's keep it as minimal as possible.
    await deployer.logger.addLog('MNEMONIC_RECEIVED', { received: true });

    function getWallet() {
        const wallet = deployer.createWallet(userInputMnemonic, networkName);
        // Each time we need a wallet, we create it and log that.
        deployer.logger.addLog('WALLET_CREATED', { timestamp: +new Date() });
        console.log(`\x1b[35m /!\\ WALLET_CREATED for ${networkName} with address ${wallet.address} at ${+new Date()}\x1b[0m`);
        return wallet;
    }

    deployment.provider = deployer.createProvider(networkName);
    deployment.getWallet = getWallet;

    // Network check
    const networkInfo = {
        providerNetwork: await deployment.provider.getNetwork(),
        configNetwork: network
    };
    deployer.logger.addLog('CHECKING_NETWORK', networkInfo);
    const networkMatches = parseInt(networkInfo.providerNetwork.chainId) === parseInt(networkInfo.configNetwork.chainId);
    
    if (!networkMatches) {
        throw new Error(`Network mismatch. Expected chainId ${networkInfo.configNetwork.chainId}, got ${networkInfo.providerNetwork.chainId}`);
    }

    deployer.logger.addLog('NETWORK_CHECK_SUCCESS', networkInfo);

    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployer.logger.addLog('\x1b[32mPREPARE_ENV_SUCCESS\x1b[0m', `Time taken: ${processResult.timeTaken}ms`);
    processResult.logger = deployer.logger.export();

    deployment.processes.prepareEnvironment = processResult;
    return deployment;
} 