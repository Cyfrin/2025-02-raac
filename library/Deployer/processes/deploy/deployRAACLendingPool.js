import findContructorArg  from "../../utils/findContructorArg.js";

export async function deployRAACLendingPool(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mDEPLOY_RAAC_LENDING_POOL_START\x1b[0m', { config, timeStart: processResult.timeStart });
    
    const wallet = deployment.getWallet();

    // Release RToken dependency of RAACLendingPool
    if(!deployment.dependencies.RToken) {
        const RTokenArtifact = await deployer.readArtifactFile("RToken");
        const RTokenArgs = findContructorArg(deployment.constructorArgs['RToken'], deployment.contracts);
        const prepared = {
            contractName: "RToken",
            artifact: RTokenArtifact,
            originalArgs: RTokenArgs,
        }
        const rtokenReceipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['RToken'] = rtokenReceipt.receipt.contractAddress;
        deployment.dependencies.RToken = {
            address: rtokenReceipt.receipt.contractAddress,
        };
    }else{
        deployment.contracts['RToken'] = deployment.dependencies.RToken.address;
    }

    // Release DebtToken dependency of RAACLendingPool
    if(!deployment.dependencies.DebtToken) {
        const DebtTokenArtifact = await deployer.readArtifactFile("DebtToken");
        const DebtTokenArgs = findContructorArg(deployment.constructorArgs['DebtToken'], deployment.contracts);
        const prepared = {
            contractName: "DebtToken",
            artifact: DebtTokenArtifact,
            originalArgs: DebtTokenArgs,
        }
        const debtTokenReceipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['DebtToken'] = debtTokenReceipt.receipt.contractAddress;
        deployment.dependencies.DebtToken = {
            address: debtTokenReceipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['DebtToken'] = deployment.dependencies.DebtToken.address;
    }

    // Release RAACLendingPool
    if(!deployment.dependencies.RAACNFT) {
        throw new Error('RAACNFT not found in deployed contracts');
    }
    // Release RAACLendingPool & its dependencies
    if(!deployment.dependencies.RAACLendingPool) {
        const RAACLendingPoolArtifact = await deployer.readArtifactFile("LendingPool");

        const RAACLendingPoolArgs = findContructorArg(deployment.constructorArgs['LendingPool'], deployment.contracts);
        const prepared = {
            contractName: "RAACLendingPool",
            artifact: RAACLendingPoolArtifact,
            originalArgs: RAACLendingPoolArgs,
        }
        const receipt = await deployer.deploy(prepared, wallet, deployment.contracts, deployment.signer.fee);
        deployment.contracts['RAACLendingPool'] = receipt.receipt.contractAddress;
        deployment.dependencies.RAACLendingPool = {
            address: receipt.receipt.contractAddress,
        };
    } else {
        deployment.contracts['RAACLendingPool'] = deployment.dependencies.RAACLendingPool.address;
    }

    processResult.logger = deployer.logger.export();
    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;

    deployment.processes.deployRAACNFT = processResult;
    return deployment;
} 