// DEPRECATED: We do not have this function anymore.

import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';

async function updatePriceFromOracle(chainId, tokenId, newPrice, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const raacHousePricesAddress = getContractAddress(chainId, 'raachouseprices');
    const raacHousePricesABI = getABI('raachouseprices');

    const raacHousePricesContract = new ethers.Contract(raacHousePricesAddress, raacHousePricesABI, signer);

    const tx = await raacHousePricesContract.updatePriceFromOracle(tokenId, newPrice);
    await tx.wait();

    console.log(`Price updated for token ${tokenId}: ${newPrice}`);
    return tx;
  } catch (error) {
    console.error('Error updating price from oracle:', error);
    throw new Error(`Failed to update price from oracle: ${error.message}`);
  }
}

export default updatePriceFromOracle;