import { ethers } from 'ethers';

export default async function executeTokenDeployment(deployment, wallet, args) {
    const { logger } = this;
    
    logger.addLog('EXECUTE_TOKEN_DEPLOYMENT_START', { deployment });

    try {
        logger.addLog('EXECUTE_TOKEN_DEPLOYMENT_START', { deployment });

        // Step 1: Deploy RAAC Token
        logger.addLog('DEPLOY_TOKEN_START', deployment.token);
        const RAACTokenArtifact = await this.readArtifactFile("RAACToken");

        const prepared = await this.prepareDeploy([
            {
                contractName: "RAACToken",
                artifact: RAACTokenArtifact,
                args: args
            }
        ], wallet);

        const results = await this.deploy(prepared, wallet);
        await token.deployed();
        logger.addLog('DEPLOY_TOKEN_SUCCESS', { 
            address: token.address,
            tx: token.deployTransaction.hash,
            results
        });

        // Step 2: Deploy RAACReleaseOrchestrator
        logger.addLog('DEPLOY_ORCHESTRATOR_START', deployment.orchestrator);
        const preparedOrchestrator = await this.prepareDeploy([
            {
                contractName: "RAACReleaseOrchestrator",
                artifact: RAACTokenArtifact,
                args: [token.address]
            }
        ], wallet);

        const resultsOrchestrator = await this.deploy(preparedOrchestrator, wallet);
        logger.addLog('DEPLOY_ORCHESTRATOR_SUCCESS', {
            address: resultsOrchestrator.address,
            tx: resultsOrchestrator.deployTransaction.hash,
            results: resultsOrchestrator
        });

        // Step 3: Deploy RAACMinter
        logger.addLog('DEPLOY_MINTER_START', deployment.minter);
        const RAACMinterArtifact = await this.readArtifactFile("RAACMinter");
        const preparedMinter = await this.prepareDeploy([
            {
                contractName: "RAACMinter",
                artifact: RAACMinterArtifact,
                args: [token.address]
            }
        ], wallet);
        const resultsMinter = await this.deploy(preparedMinter, wallet);

        logger.addLog('DEPLOY_MINTER_SUCCESS', {
            address: resultsMinter.address,
            tx: resultsMinter.deployTransaction.hash,
            results: resultsMinter
        });

        // Step 4: Configure Orchestrator Categories
        logger.addLog('SETUP_VESTING_START', { wallets: deployment.wallets });
        for (const wallet of deployment.wallets) {
            const tx = await orchestrator.createVestingSchedule(
                wallet.address,
                ethers.utils.parseUnits(wallet.amount, 18),
                wallet.schedules[0].startTime,
                wallet.schedules[0].endTime - wallet.schedules[0].startTime,
                ethers.utils.id(wallet.category)
            );
            await tx.wait();
            logger.addLog('SETUP_VESTING_SUCCESS', {
                address: wallet.address,
                amount: wallet.amount,
                tx: tx.hash
            });
        }

        const result = {
            token: {
                address: token.address,
                tx: token.deployTransaction.hash
            },
            orchestrator: {
                address: orchestrator.address,
                tx: orchestrator.deployTransaction.hash
            },
            minter: {
                address: minter.address,
                tx: minter.deployTransaction.hash
            }
        };

        logger.addLog('EXECUTE_TOKEN_DEPLOYMENT_SUCCESS', result);
        return result;

    } catch (error) {
        logger.addLog('EXECUTE_TOKEN_DEPLOYMENT_ERROR', {
            error: error.message
        });
        throw error;
    }
} 