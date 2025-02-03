import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';
import estimateGasPrice from '../methods/commons/estimateGasPrice.js';

async function tick(chainId, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const raacMinterAddress = getContractAddress(chainId, 'raacminter');
    const raacMinterABI = getABI('raacminter');

    const raacMinterContract = new ethers.Contract(raacMinterAddress, raacMinterABI, signer);

    const { maxFeePerGas } = await estimateGasPrice(signer);
   
    console.log({ maxFeePerGas });
    const tick = await raacMinterContract.tick({
      maxFeePerGas,
      nonce: await signer.getNonce()
    });
 
    if(tick.wait) {
      await tick.wait();
    }
    return tick;
  } catch (error) {
    throw new Error(`Error calculating RAAC rewards: ${error.message}`);
  }
}

export default tick;