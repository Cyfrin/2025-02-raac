import { ethers } from 'ethers';
import configs from '@/configs/chains';

const TOTAL_SUPPLY_ABI = 'function totalSupply() view returns (uint256)';

/**
 * 
 * @param {string} contractAddress 
 * @param {number} chainId 
 * @param {ethers.JsonRpcProvider} [provider] 
 * @returns {Promise<string>}
 */
export const getTotalSupply = async (chainId, contractAddress, provider) => {
    if (!provider) {
        if (!chainId) {
            throw new Error('Contract address not found in any chain configuration');
        }
        const rpc = configs[chainId].rpc;
        provider = new ethers.JsonRpcProvider(rpc);
    }

    console.log(`Getting total supply for ${contractAddress} on ${provider.chainId} using provider ${provider}`);
    const contract = new ethers.Contract(contractAddress, [TOTAL_SUPPLY_ABI], provider);
    const totalSupply = await contract.totalSupply();
    return ethers.formatEther(totalSupply);
  };