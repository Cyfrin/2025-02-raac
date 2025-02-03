import { ethers } from 'ethers';
import { getContractAddress } from '../contracts/getContractAddress.js';
import estimateGasPrice from './commons/estimateGasPrice.js';

const approveToken = async (chainId, tokenSymbol, spender, amount, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  const tokenAddress = getContractAddress(chainId, tokenSymbol);
  const tokenABI = ['function approve(address spender, uint256 amount) public returns (bool)'];
  const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

  try {
    const amountInWei = ethers.parseEther(amount);
    const { maxFeePerGas } = await estimateGasPrice(signer);

    const tx = await tokenContract.approve(spender, amountInWei, {
      maxFeePerGas,
      // maxPriorityFeePerGas
    });

    console.log(`Approval transaction sent:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Approved ${amount} ${tokenSymbol} for ${spender} successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Approval error:`, error);
    throw new Error(`Token approval failed: ${error.message}`);
  }
};

export default approveToken;
