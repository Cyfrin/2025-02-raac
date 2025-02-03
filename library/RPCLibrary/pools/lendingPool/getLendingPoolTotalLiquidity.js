import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';

async function getLendingPoolTotalLiquidity(chainId, provider) {
  try {
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    const abi = getABI('lendingpool');
    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, abi, provider);
    const totalLiquidity = await lendingPoolContract.getTotalLiquidity();
    return totalLiquidity;
  } catch (error) {
    console.error('Error fetching total liquidity:', error);
    throw error;
  }
}

export default getLendingPoolTotalLiquidity;