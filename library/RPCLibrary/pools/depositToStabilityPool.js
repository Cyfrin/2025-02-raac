import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';
import estimateGasPrice from '../methods/commons/estimateGasPrice.js';

async function depositToStabilityPool(chainId, amount, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const stabilityPoolAddress = getContractAddress(chainId, 'stabilitypool');
    const abi = getABI('stabilitypool');
    const stabilityPoolContract = new ethers.Contract(stabilityPoolAddress, abi, signer);

    const amountInWei = ethers.parseEther(amount);
    const { maxFeePerGas } = await estimateGasPrice(signer);

    const tx = await stabilityPoolContract.deposit(amountInWei.toString(), {
      maxFeePerGas,
      nonce: await signer.getNonce()
    });

    console.log(`Deposit transaction sent to Stability Pool:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Deposited ${amount} to Stability Pool successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Error depositing to Stability Pool:`, error);
    throw new Error(`Deposit to Stability Pool failed: ${error.message}`);
  }
}

export default depositToStabilityPool;