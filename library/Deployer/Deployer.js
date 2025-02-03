import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { DEPLOYER_EVENTS } from './events/index.js';
import prepareDeploy from './methods/prepareDeploy.js';
import deploy from './methods/deploy.js';
import executeTGE from './methods/executeTGE.js';
import prepareTGE from './methods/prepareTGE.js';
import prepareTokenDeployment from './methods/prepareTokenDeployment.js';
import executeTokenDeployment from './methods/executeTokenDeployment.js';
import prepareLiquiditySetup from './methods/prepareLiquiditySetup.js';
import executeLiquiditySetup from './methods/executeLiquiditySetup.js';
import listNetworkFiles from './methods/listNetworkFiles.js';
import preparePublicSale from './methods/preparePublicSale.js';
import executePublicSale from './methods/executePublicSale.js';
import prepareTokenPermissions from './methods/prepareTokenPermissions.js';
import executeTokenPermissions from './methods/executeTokenPermissions.js';
import ParaLogger from './utils/ParaLogger/ParaLogger.js';
import readArtifactFile from './methods/readArtifactFile.js';
import readNetworkFile from './methods/readNetworkFile.js';
import saveDeploymentState from './methods/saveDeploymentState.js';
import loadDeploymentState from './methods/loadDeploymentState.js';

import StateAdapter from './adapters/StateAdapter/StateAdapter.js';

class Deployer extends EventEmitter {
    constructor(options = {}) {
        super();
        // this.logger = new ParaLogger(5.5);
        this.logger = new ParaLogger(1);
        // Is set when network is set
        this.stateAdapter = null;
        this.options = {
            confirmations: true,
            verbose: true,
            ...options
        };
        this.deployedContracts = {};
        this.currentStatus = {
            completedSteps: [],
            currentStep: null,
            errors: []
        };
        this.signer = null;

        this.networks = {};

        // Forward logger events to deployer events
        this.logger.on('ADD_LOG', (log) => {
            this.emit(DEPLOYER_EVENTS.STATUS_UPDATE, { 
                type: log.type, 
                data: log.data 
            });
        });

        this.contractArtifacts = {};
    }

    async requireInput(prompt, type = 'text') {
        return new Promise((resolve) => {
            this.emit(DEPLOYER_EVENTS.INPUT_REQUIRED, { prompt, type });
            
            const handler = ({ input }) => {
                this.removeListener(DEPLOYER_EVENTS.INPUT_RECEIVED, handler);
                resolve(input);
            };
            
            this.on(DEPLOYER_EVENTS.INPUT_RECEIVED, handler);
        });
    }

    async requireConfirmation(message, data = {}) {
        return new Promise((resolve) => {
            this.emit(DEPLOYER_EVENTS.CONFIRMATION_REQUIRED, { message, data });

            
            const handler = ({ confirmed }) => {
                this.removeListener(DEPLOYER_EVENTS.CONFIRMATION_RECEIVED, handler);
                resolve(confirmed);
            };
            
            this.on(DEPLOYER_EVENTS.CONFIRMATION_RECEIVED, handler);
        });
    }

    async executeTransaction(description, txFunction) {
        this.emit(DEPLOYER_EVENTS.TRANSACTION_START, { description });
        
        try {
            const signer = this.getSigner();
            const tx = await txFunction(signer);
            
            // Ensure we have a valid transaction hash
            if (!tx?.hash) {
                throw new Error('No transaction hash returned from transaction');
            }
            
            this.emit(DEPLOYER_EVENTS.TRANSACTION_HASH, { hash: tx.hash });
            
            // Wait for transaction confirmation
            const receipt = await signer.provider.waitForTransaction(tx.hash);
            
            if (!receipt) {
                throw new Error('No receipt received for transaction');
            }
            
            this.emit(DEPLOYER_EVENTS.TRANSACTION_CONFIRMED, { 
                hash: tx.hash, 
                receipt,
                ...tx
            });
            
            return {
                hash: tx.hash,
                receipt,
                ...tx
            };
        } catch (error) {
            this.emit(DEPLOYER_EVENTS.TRANSACTION_ERROR, { 
                description, 
                error: error.message || error 
            });
            throw error;
        }
    }

    updateStatus(stepId, status) {
        if (status === 'complete') {
            this.currentStatus.completedSteps.push(stepId);
            this.currentStatus.currentStep = null;
        } else if (status === 'error') {
            this.currentStatus.errors.push(stepId);
        } else {
            this.currentStatus.currentStep = stepId;
        }
        
        this.emit(DEPLOYER_EVENTS.STATUS_UPDATE, { 
            status: this.currentStatus 
        });
    }

    getStatus() {
        return {
            ...this.currentStatus,
            deployedContracts: this.deployedContracts
        };
    }

    getDeployedContracts() {
        return this.deployedContracts;
    }

    getStats() {
        return this.logger.getStats();
    }

    getSigner() {
        if (!this.signer) {
            throw new Error('Signer not initialized. Run environment preparation first.');
        }
        return this.signer;
    }
    

    getContract(contractName) {
        const artifact = this.getContractArtifact(contractName);
        const address = this.getDeployedContracts()[contractName];
        return new ethers.Contract(address, artifact.abi, this.signer);
    }

    getContractArtifact(contractName) {
        if (this.contractArtifacts[contractName]) {
            return this.contractArtifacts[contractName];
        }
        const artifact = this.readArtifactFile(contractName);
        this.contractArtifacts[contractName] = artifact;
        return artifact;
    }

    getStateAdapter() {
        if(!this.stateAdapter) {
            throw new Error('State adapter not initialized. Run setNetwork first.');
        }
        return this.stateAdapter;
    }

    setNetwork(network) {
        if(!network?.network) {
            throw new Error('Network is required as Network object');
        }
        this.networks[network.network] = network;
        this.stateAdapter = new StateAdapter(network.network);
    }

    getNetwork(network) {
        return this.networks[network] || null;
    }

    createRandomMnemonic() {
        const wallet = ethers.Wallet.createRandom();
        return wallet.mnemonic.phrase;
    }
    
    createProvider(network) {
        if (!this.getNetwork(network)) {
            throw new Error(`Network ${network} not found`);
        }
        return new ethers.JsonRpcProvider(this.getNetwork(network).rpcUrl);
    }

    createWallet(mnemonic, network) {
        const provider = this.createProvider(network);
        const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);
        console.info(`[${network}] Created wallet: ${wallet.address}`);
        if(!this.signer) {
            this.signer = wallet;
        }
        return wallet;
    }
}

Deployer.prototype.DEPLOYER_EVENTS = DEPLOYER_EVENTS;

Deployer.prototype.readArtifactFile = readArtifactFile;
Deployer.prototype.listNetworkFiles = listNetworkFiles;
Deployer.prototype.readNetworkFile = readNetworkFile;
Deployer.prototype.prepareDeploy = prepareDeploy;
Deployer.prototype.deploy = deploy;
Deployer.prototype.prepareTGE = prepareTGE;
Deployer.prototype.executeTGE = executeTGE;
Deployer.prototype.prepareTokenDeployment = prepareTokenDeployment;
Deployer.prototype.executeTokenDeployment = executeTokenDeployment;
Deployer.prototype.prepareLiquiditySetup = prepareLiquiditySetup;
Deployer.prototype.executeLiquiditySetup = executeLiquiditySetup;
Deployer.prototype.preparePublicSale = preparePublicSale;
Deployer.prototype.executePublicSale = executePublicSale;
Deployer.prototype.prepareTokenPermissions = prepareTokenPermissions;
Deployer.prototype.executeTokenPermissions = executeTokenPermissions;
Deployer.prototype.saveDeploymentState = saveDeploymentState;
Deployer.prototype.loadDeploymentState = loadDeploymentState;
export default Deployer;
