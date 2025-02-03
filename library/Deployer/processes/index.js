import { ethers } from 'ethers';

import { prepareEnvironment } from './prepare/prepareEnvironment.js';
import { prepareContracts } from './prepare/prepareContracts.js';
import { prepareTGE } from './prepare/prepareTGE.js';
import { prepareCRVUSD } from './prepare/prepareCRVUSD.js';
import { deployRAACToken } from './deploy/deployRAACToken.js';
import { deployRAACReleaseOrchestrator } from './deploy/deployRAACReleaseOrchestrator.js';
import { deployRAACHousePrices } from './deploy/deployRAACHousePrices.js';
import { deployRAACOracle } from './deploy/deployRAACOracle.js';
import { deployRAACNFT } from './deploy/deployRAACNFT.js';
import { deployRAACLendingPool } from './deploy/deployRAACLendingPool.js';
import { initializeStabilityPool } from './init/initializeStabilityPool.js';
import { linkLendingPool } from './links/linkLendingPool.js';
import { deployStabilityPool } from './deploy/deployStabilityPool.js';
import { deployRAACMinter } from './deploy/deployRAACMinter.js';
import { deployFeeCollector } from './deploy/deployFeeCollector.js';
import { deployDEToken } from './deploy/deployDEToken.js';
import { deployTreasury } from './deploy/deployTreasury.js';
import { deployRepairFund } from './deploy/deployRepairFund.js';
import { deployveRAACToken } from './deploy/deployveRAACToken.js';
import { setupLinks } from './verify/setupLinks.js';
import { verifyDeployment } from './verify/verifyDeployment.js';
import { linkFeeCollector } from './links/linkFeeCollector.js';
import { linkRAACMinter } from './links/linkRAACMinter.js';
import { linkRAACToken } from './links/linkRAACToken.js';
import { linkOracle } from './links/linkOracle.js';
import { processRAACTGE } from './process/processRAACTGE.js';
import { finalizeDeployment } from './finalize/finalizeDeployment.js';
export const processes = [
    {
        id: 'prepareEnvironment',
        handler: prepareEnvironment,
        name: 'Prepare Environment',
        description: 'Setup deployment wallet and verify network configuration',
        active: true
    },
    {
        id: 'prepareContracts',
        handler: prepareContracts,
        name: 'Prepare Contracts',
        description: 'Load and validate smart contract artifacts',
        active: true
    },
    {
        id: 'prepareTGE',
        handler: prepareTGE,
        name: 'Prepare TGE',
        description: 'Configure token generation event parameters',
        active: true
    },
    {
        id: 'prepareCRVUSD',
        handler: prepareCRVUSD,
        name: 'Prepare CRVUSD',
        description: 'Prepare the CRVUSD token',
        active: true
    },
    {
        id: 'deployRAACToken',
        handler: deployRAACToken,
        name: 'Deploy RAAC Token',
        description: 'Deploy and configure the RAAC token contract',
        active: true
    },
    {
        id: 'linkRAACToken',
        handler: linkRAACToken,
        name: 'Link RAAC Token',
        description: 'Link the RAAC token contract',
        active: true
    },
    {
        id: 'deployveRAACToken',
        handler: deployveRAACToken,
        name: 'Deploy veRAAC Token',
        description: 'Deploy and configure the veRAAC token contract',
        active: true
    },
    {
        id: 'deployRAACReleaseOrchestrator',
        handler: deployRAACReleaseOrchestrator,
        name: 'Deploy RAAC Release Orchestrator',
        description: 'Deploy and configure the RAAC release orchestrator contract',
        active: true
    },
    {
        id: 'deployRAACHousePrices',
        handler: deployRAACHousePrices,
        name: 'Deploy RAAC House Prices',
        description: 'Deploy and configure the RAAC house prices contract',
        active: true
    },
    {
        id: 'deployRAACOracle',
        handler: deployRAACOracle,
        name: 'Deploy RAAC Oracle',
        description: 'Deploy and configure the RAAC Oracle contract',
        active: true
    },
    {
        id: 'deployRAACNFT',
        handler: deployRAACNFT,
        name: 'Deploy RAAC NFT',
        description: 'Deploy and configure the RAAC NFT contract',
        active: true
    },
    {
        id: 'deployRAACLendingPool',
        handler: deployRAACLendingPool,
        name: 'Deploy RAAC Lending Pool',
        description: 'Deploy and configure the RAAC Lending Pool contract',
        active: true
    },
  
    {
        id: 'linkLendingPool',
        handler: linkLendingPool,
        name: 'Link Lending Pool',
        description: 'Link the RAAC Lending Pool contract',
        active: true
    },
    {
        id: 'deployStabilityPool',
        handler: deployStabilityPool,
        name: 'Deploy Stability Pool',
        description: 'Deploy and configure the Stability Pool contract',
        active: true
    },
    {
        id: 'deployTreasury',
        handler: deployTreasury,
        name: 'Deploy Treasury',
        description: 'Deploy and configure the Treasury contract',
        active: true
    },
    {
        id: 'deployRepairFund',
        handler: deployRepairFund,
        name: 'Deploy Repair Fund',
        description: 'Deploy and configure the Repair Fund contract',
        active: true
    },
    {
        id: 'deployFeeCollector',
        handler: deployFeeCollector,
        name: 'Deploy Fee Collector',
        description: 'Deploy and configure the Fee Collector contract',
        active: true
    },
    {
        id: 'deployRAACMinter',
        handler: deployRAACMinter,
        name: 'Deploy RAAC Minter',
        description: 'Deploy and configure the RAAC Minter contract',
        active: true
    },
    {
        id: 'processRAACTGE',
        handler: processRAACTGE,
        name: 'Process RAAC TGE',
        description: 'Process the RAAC TGE',
        active: true
    },
    {
        id: 'linkRAACMinter',
        handler: linkRAACMinter,
        name: 'Link RAAC Minter',
        description: 'Link the RAAC Minter contract',
        active: true
    },
    {
        id: 'linkOracle',
        handler: linkOracle,
        name: 'Link Oracle',
        description: 'Link the Oracle contract',
        active: true
    },
    {
        id: 'linkFeeCollector',
        handler: linkFeeCollector,
        name: 'Link Fee Collector',
        description: 'Link the Fee Collector contract',
        active: true
    },
    {
        id: 'initializeStabilityPool',
        handler: initializeStabilityPool,
        name: 'Initialize Stability Pool',
        description: 'Initialize the Stability Pool',
        active: true
    },
    {
        id: 'setupLinks',
        handler: setupLinks,
        name: 'Setup Contract Links',
        description: 'Link contracts and lock TGE allocations',
        active: false
    },
    {
        id: 'verifyDeployment',
        handler: verifyDeployment,
        name: 'Verify Deployment',
        description: 'Verify contracts and perform RPC checks',
        active: false
    },
    {
        id: 'finalizeDeployment',
        handler: finalizeDeployment,
        name: 'Finalize Deployment',
        description: 'Finalize the deployment',
        active: true
    },
    {
        id: 'postDeployment',
        handler: async (deployer, config, deployment) => {
            // // Test from ReleaseOrchestrator
            // const releaseOrchestratorArtifact = await deployer.readArtifactFile("RAACReleaseOrchestrator");
            // const wallet = deployment.getWallet();

            // const releaseOrchestratorContract = new ethers.Contract(deployment.contracts.RAACReleaseOrchestrator, releaseOrchestratorArtifact.abi, wallet);
            // try {
            //     const releaseTx = await releaseOrchestratorContract.release();
            //     const releaseReceipt = await releaseTx.wait();
            // } catch (error) {
            //     if (error.code === 'CALL_EXCEPTION') {
            //         console.log(releaseOrchestratorContract.interface.parseError(error.data));
            //     }
            // }
            // from keyName: address to object[keyName] = { address: address }
            const structuredDeployedContracts = {};
            for(const [key, value] of Object.entries(deployment.contracts)) {
                structuredDeployedContracts[key] = { address: value };
            }
            console.log({structuredDeployedContracts, network: deployment.network});
            deployment.structuredDeployedContracts = structuredDeployedContracts;
            return deployment;
        },
        name: 'Post Deployment',
        description: 'Post deployment actions',
        active: true
    }
]; 