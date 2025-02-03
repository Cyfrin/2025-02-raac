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
    console.log('Getting total supply for', contractAddress, 'on chain', chainId);
    if (!provider) {
        console.log('Chain ID', chainId);
        if (!chainId) {
            throw new Error('Contract address not found in any chain configuration');
        }
        const rpc = configs[chainId].rpc;
        provider = new ethers.JsonRpcProvider(rpc);
    }

    const contract = new ethers.Contract(contractAddress, [TOTAL_SUPPLY_ABI], provider);
    const totalSupply = await contract.totalSupply();
    return ethers.formatEther(totalSupply);
  };