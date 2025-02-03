import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';
import estimateGasPrice from '../methods/commons/estimateGasPrice.js';

async function calculateRAACRewards(chainId, address, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const stabilityPoolAddress = getContractAddress(chainId, 'stabilitypool');
    const stabilityPoolABI = getABI('stabilitypool');

    const stabilityPoolContract = new ethers.Contract(stabilityPoolAddress, stabilityPoolABI, signer);

    const { maxFeePerGas } = await estimateGasPrice(signer);

   
    const calculateRAACRewards = await stabilityPoolContract.calculateRaacRewards(address);
    // address, {
    //   maxFeePerGas,
    //   nonce: await signer.getNonce()
    // });

    console.log(calculateRAACRewards);
    return calculateRAACRewards;
  } catch (error) {
    throw new Error(`Error calculating RAAC rewards: ${error.message}`);
  }
}

export default calculateRAACRewards;