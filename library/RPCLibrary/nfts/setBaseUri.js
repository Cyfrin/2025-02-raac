import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';

async function setBaseUri(chainId, newUri, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const raacNFTAddress = getContractAddress(chainId, 'raacnft');
    const raacNFTABI = getABI('raacnft');

    const raacNFTContract = new ethers.Contract(raacNFTAddress, raacNFTABI, signer);

    const tx = await raacNFTContract.setBaseUri(newUri);
    await tx.wait();

    console.log(`Set new base URI: ${newUri}`);
    return tx;
  } catch (error) {
    console.error('Error setting base URI:', error);
    throw new Error(`Failed to set base URI: ${error.message}`);
  }
}

export default setBaseUri;