import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';
import estimateGasPrice from '../../methods/commons/estimateGasPrice.js';

async function approveAsset(chainId, assetId, spender, amount, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const tokenAddress = getContractAddress(chainId, assetId);
    const abi = getABI(assetId);
    const tokenContract = new ethers.Contract(tokenAddress, abi, signer);

    const amountInWei = ethers.parseEther(amount);
    const { maxFeePerGas } = await estimateGasPrice(signer);

    const tx = await tokenContract.approve(spender, amountInWei, {
      maxFeePerGas,
      nonce: await signer.getNonce()
    });

    console.log(`Approval transaction sent for ${assetId}:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Approved ${amount} ${assetId} for ${spender} successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Approval error for ${assetId}:`, error);
    throw new Error(`Token approval failed for ${assetId}: ${error.message}`);
  }
}

export default approveAsset;