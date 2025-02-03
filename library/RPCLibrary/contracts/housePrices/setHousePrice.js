import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';

// @deprecated - This function is not used in the current version of the codebase
async function setHousePrice(chainId, tokenId, amount, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const raacHousePricesAddress = getContractAddress(chainId, 'raachouseprices');
    const raacHousePricesABI = getABI('raachouseprices');

    const raacHousePricesContract = new ethers.Contract(raacHousePricesAddress, raacHousePricesABI, signer);

    const tx = await raacHousePricesContract.setHousePrice(tokenId, amount);
    await tx.wait();

    console.log(`House price set for token ${tokenId}: ${amount}`);
    return tx;
  } catch (error) {
    console.error('Error setting house price:', error);
    throw new Error(`Failed to set house price: ${error.message}`);
  }
}

export default setHousePrice;