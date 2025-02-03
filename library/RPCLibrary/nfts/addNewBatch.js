import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';

async function addNewBatch(chainId, batchSize, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const raacNFTAddress = getContractAddress(chainId, 'raacnft');
    const raacNFTABI = getABI('raacnft');

    const raacNFTContract = new ethers.Contract(raacNFTAddress, raacNFTABI, signer);

    const tx = await raacNFTContract.addNewBatch(batchSize);
    await tx.wait();

    console.log(`Added new batch of size ${batchSize}`);
    return tx;
  } catch (error) {
    console.error('Error adding new batch:', error);
    throw new Error(`Failed to add new batch: ${error.message}`);
  }
}

export default addNewBatch;