import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';

async function getCurrentBatchSize(chainId, provider) {
  try {
    const raacNFTAddress = getContractAddress(chainId, 'raacnft');
    const raacNFTABI = getABI('raacnft');

    const raacNFTContract = new ethers.Contract(raacNFTAddress, raacNFTABI, provider);

    const batchSize = await raacNFTContract.currentBatchSize();
    return batchSize.toString();
  } catch (error) {
    console.error('Error getting current batch size:', error);
    throw new Error(`Failed to get current batch size: ${error.message}`);
  }
}

export default getCurrentBatchSize;