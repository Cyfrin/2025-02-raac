import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';
import estimateGasPrice from '../methods/commons/estimateGasPrice.js';

async function getApy(chainId, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const raacMinterAddress = getContractAddress(chainId, 'raacminter');
    const raacMinterABI = getABI('raacminter');
    const raacMinterContract = new ethers.Contract(raacMinterAddress, raacMinterABI, signer);

    const result = {}
    result.emissionRate = await raacMinterContract.emissionRate();
    result.BLOCKS_PER_DAY = await raacMinterContract.BLOCKS_PER_DAY();


    // APY: 
    const blocksPerYear = result.BLOCKS_PER_DAY * 365n;
    const emissionRatePerYear = result.emissionRate * blocksPerYear;
    const totalSupply = await raacMinterContract.getTotalSupply();

    const apy = emissionRatePerYear * 10000n / totalSupply;
    return apy;
  } catch (error) {
    throw new Error(`Error calculating RAAC rewards: ${error.message}`);
  }
}

export default getApy;