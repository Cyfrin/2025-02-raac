import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';

async function getVaultedNFTs(chainId, address, provider) {
  try {
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    const lendingPoolABI = getABI('lendingpool');

    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolABI, provider);

    // Get the RAACVault address
    const raacVaultAddress = await lendingPoolContract.raacVault();

    // Get the RAACVault contract
    const raacVaultABI = getABI('raacvault');
    const raacVaultContract = new ethers.Contract(raacVaultAddress, raacVaultABI, provider);

    // Get the total number of staked NFTs for the user
    const stakedNFTCount = await raacVaultContract.getStakedNFTCount(address);

    const vaultedTokens = [];
    for (let i = 0; i < stakedNFTCount; i++) {
      const tokenId = await raacVaultContract.getStakedNFTByIndex(address, i);
      vaultedTokens.push(tokenId.toString());
    }

    return { address, vaultedTokens };
  } catch (error) {
    console.error('Error getting vaulted NFTs:', error);
    throw new Error(`Failed to get vaulted NFTs: ${error.message}`);
  }
}

export default getVaultedNFTs;