import configs from '../configs/chains/index.js';

/**
 * Get the contract address for a given asset on a specific chain
 * @param {number} chainId 
 * @param {string} contractName 
 * @returns {string}
 */
export const getContractAddress = (chainId, contractName) => {
    const normalizedContractName = contractName.toLowerCase();
    
    if (!chainId) {
        throw new Error('Chain ID is required');
    }
    
    const config = configs[chainId];
    
    if (!config) {
        throw new Error(`Chain configuration not found for chainId: ${chainId}`);
    }
    
    const lookupKeys = ['contracts', 'assets', 'pools', 'nfts'];
    
    let address = null;
    for (const key of lookupKeys) {
        if (config[key] && config[key][normalizedContractName]) {
            address = config[key][normalizedContractName].contract || config[key][normalizedContractName];
            break;
        }
    }
    
    if (!address) {
        console.error(`Contract address not found for ${normalizedContractName} on chain ${chainId}`);
        console.error('Available contracts:', Object.keys(config.contracts));
        throw new Error(`Contract ${normalizedContractName} not found for chain ID: ${chainId}`);
    }
    
    return address;
};

export default getContractAddress;