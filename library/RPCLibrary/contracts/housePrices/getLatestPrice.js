import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';

async function getLatestPrice(chainId, tokenId, provider) {
  try {
    const raacHousePricesAddress = getContractAddress(chainId, 'raachouseprices');
    const raacHousePricesABI = getABI('raachouseprices');

    const raacHousePricesContract = new ethers.Contract(raacHousePricesAddress, raacHousePricesABI, provider);

    const [price, timestamp] = await raacHousePricesContract.getLatestPrice(tokenId);

    return { price, timestamp };
  } catch (error) {
    console.error('Error getting latest price:', error);
    return { price: -1, timestamp: -1 };
    // console.error('Error getting latest price:', error);
    // throw new Error(`Failed to get latest price: ${error.message}`);
  }
}

export default getLatestPrice;