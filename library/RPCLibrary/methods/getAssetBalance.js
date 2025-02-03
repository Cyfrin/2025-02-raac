import { ethers } from 'ethers';
import { getContractAddress } from '../contracts/getContractAddress.js';

const getAssetBalance = async (chainId, address, assetId, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }
  try {
    if(assetId === 'eth') {
      // handle getBalance do not exist in ethers.js, check if not under the other method TODO FIXME
      const balance = (await signer.provider.getBalance(address)).toString();
      return balance;
    }
    const tokenAddress = getContractAddress(chainId, assetId);
    const abi = ['function balanceOf(address) view returns (uint256)'];
    const contract = new ethers.Contract(tokenAddress, abi, signer);
    
    const balance = await contract.balanceOf(address);
    
    return ethers.formatEther(balance);
  } catch (error) {
    console.error(`Error in getAssetBalance for ${assetId}:`, error);
    if (error.code === 'BAD_DATA') {
      console.error('Contract might not have balanceOf function. Check the contract address and ABI.');
    }
    throw new Error(`Failed to fetch balance for ${assetId}: ${error.message}`);
  }
};

export default getAssetBalance;

export { getAssetBalance };