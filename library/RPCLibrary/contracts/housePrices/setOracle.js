import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';

async function setOracle(chainId, newOracleAddress, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const raacHousePricesAddress = getContractAddress(chainId, 'raachouseprices');
    const raacHousePricesABI = getABI('raachouseprices');

    const raacHousePricesContract = new ethers.Contract(raacHousePricesAddress, raacHousePricesABI, signer);

    const tx = await raacHousePricesContract.setOracle(newOracleAddress);
    await tx.wait();

    console.log(`Oracle address updated to: ${newOracleAddress}`);
    return tx;
  } catch (error) {
    console.error('Error setting oracle:', error);
    throw new Error(`Failed to set oracle: ${error.message}`);
  }
}

export default setOracle;