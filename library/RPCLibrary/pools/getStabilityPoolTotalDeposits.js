import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';

async function getStabilityPoolTotalDeposits(chainId, provider) {
  try {
    const stabilityPoolAddress = getContractAddress(chainId, 'stabilitypool');
    const abi = getABI('stabilitypool');
    const stabilityPoolContract = new ethers.Contract(stabilityPoolAddress, abi, provider);
    const totalDeposits = await stabilityPoolContract.getTotalDeposits();
    return totalDeposits;
  } catch (error) {
    console.error('Error fetching total deposits:', error);
    throw error;
  }
}

export default getStabilityPoolTotalDeposits;