import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';

async function getHousePrice(chainId, tokenId, provider) {
  try {
    const raacNFTAddress = getContractAddress(chainId, 'raacnft');
    const raacNFTABI = getABI('raacnft');

    const raacNFTContract = new ethers.Contract(raacNFTAddress, raacNFTABI, provider);

    const price = await raacNFTContract.getHousePrice(tokenId);
    return ethers.formatEther(price);
  } catch (error) {
    console.error('Error getting house price:', error);
    throw new Error(`Failed to get house price: ${error.message}`);
  }
}

export default getHousePrice;