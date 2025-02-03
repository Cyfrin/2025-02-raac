import { Contract } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';

async function getVaultAddress(chainId, provider) {
  try {
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    const lendingPoolABI = getABI('lendingpool');

    const lendingPoolContract = new Contract(lendingPoolAddress, lendingPoolABI, provider);

    const vaultAddress = await lendingPoolContract.raacVault();
    return vaultAddress;
  } catch (error) {
    console.error('Error getting vault address:', error);
    throw new Error(`Failed to get vault address: ${error.message}`);
  }
}

export default getVaultAddress;
