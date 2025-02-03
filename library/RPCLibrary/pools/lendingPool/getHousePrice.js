import { ethers } from 'ethers';
import { getContractAddress } from '../../contracts/getContractAddress.js';
import { getABI } from '../../utils/artifacts.js';

async function getHousePrice(chainId, tokenId, signer) {
    console.log(chainId, tokenId, signer);
    if (!signer) {
        throw new Error('Wallet not connected');
    }

  try {
    const raacHousePricesAddress = getContractAddress(chainId, 'raachouseprices');
    const raacHousePricesABI = getABI('raachouseprices');

    const raacHousePricesContract = new ethers.Contract(raacHousePricesAddress, raacHousePricesABI, signer);

    const housePrice = await raacHousePricesContract.getLatestPrice(tokenId);
    console.log({housePrice});


    console.log(`House price for token ID ${tokenId}: ${ethers.formatEther(housePrice)} ETH`);
    return housePrice;
  } catch (error) {
    console.error(`Error getting house price for token ID ${tokenId}:`, error);
    throw new Error(`Failed to get house price: ${error.message}`);
  }
}

export default getHousePrice;