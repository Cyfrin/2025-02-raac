import { ethers } from 'ethers';
import findContructorArg from '../../utils/findContructorArg.js';

export async function prepareCRVUSD(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };

    deployer.logger.addLog('\x1b[36mPREPARE_CRVUSD_START\x1b[0m', { config, timeStart: processResult.timeStart });  

    const shouldDeploycrvUSDToken = !deployment.dependencies.crvUSDToken;


    // Deploy crvUSDToken if not already deployed
    if(shouldDeploycrvUSDToken) {
        const crvUSDTokenArtifact = await deployer.readArtifactFile("crvUSDToken");
       
        const factory = new ethers.ContractFactory(
            crvUSDTokenArtifact.abi,
            crvUSDTokenArtifact.bytecode,
            deployment.getWallet()
        );

        const faucetAddress = deployment.faucet.address;
        try {
            const crvUSDTokenArgs = findContructorArg(deployment.constructorArgs['crvUSDToken'], deployment.contracts);

            const prepared = {
                contractName: "crvUSDToken",
                artifact: crvUSDTokenArtifact,
                originalArgs: crvUSDTokenArgs,
            }

            deployer.logger.addLog('DEPLOYING_crvUSDToken', { prepared : prepared, contractName:prepared.contractName});
            const receipt = await deployer.deploy(prepared, deployment.getWallet(), deployment.contracts, deployment.signer.fee);
            deployment.contracts['crvUSDToken'] = receipt.receipt.contractAddress;
            deployment.dependencies.crvUSDToken = {
                address: receipt.receipt.contractAddress,
                tx: receipt.transactionHash,
                results: receipt
            };

            deployer.logger.addLog('DEPLOY_crvUSDToken_SUCCESS', { receipt: receipt });

            // Set faucet as minter
            const crvusdContract = new ethers.Contract(receipt.receipt.contractAddress, crvUSDTokenArtifact.abi, deployment.getWallet());
            deployer.logger.addLog('SET_CRVUSD_MINTER', { minter: faucetAddress });
            
            const minterTx = await crvusdContract.setMinter(faucetAddress);
            const minterReceipt = await minterTx.wait();
            
            deployer.logger.addLog('SET_CRVUSD_MINTER_SUCCESS', { 
                minter: faucetAddress, 
                tx: minterReceipt.hash 
            });

            deployment.contracts['crvUSDToken'] = receipt.receipt.contractAddress;

        } catch (error) {
            console.error('Error deploying crvUSDToken:', error);
            throw error;
        }
    } else {
        deployment.contracts['crvUSDToken'] = deployment.dependencies.crvUSDToken.address;
    }

    // set as first arg of contructor of lending pool
    deployment.constructorArgs['LendingPool'][0] = deployment.dependencies.crvUSDToken.address;

    deployer.logger.addLog('\x1b[32mPREPARE_CRVUSD_SUCCESS\x1b[0m', { timeTaken: processResult.timeTaken });
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    processResult.logger = deployer.logger.export();
    deployment.processes.prepareCRVUSD = processResult;

    return deployment;
}