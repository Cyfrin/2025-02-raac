import { getContractAddress } from '../../contracts/getContractAddress.js';
import estimateGasPrice from '../commons/estimateGasPrice.js';
import { ethers } from 'ethers';
import LiquidityPoolArtifact from '../../artifacts/LiquidityPool/LiquidityPool.sol/LiquidityPool.json' assert { type: "json" };

const withdrawFromLiquidityPool = async (chainId, pairedToken, lpAmount, minRaacAmount, minPairedAmount, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }
  
  const contractAddress = getContractAddress(chainId, 'liquiditypool');
  const contract = new ethers.Contract(contractAddress, LiquidityPoolArtifact.abi, signer);
  
  try {
    const lpAmountInWei = ethers.parseEther(lpAmount);
    const minRaacAmountInWei = ethers.parseEther(minRaacAmount);
    const minPairedAmountInWei = ethers.parseEther(minPairedAmount);
    const { maxFeePerGas, maxPriorityFeePerGas } = await estimateGasPrice(signer);
    
    const tx = await contract.removeLiquidity(pairedToken, lpAmountInWei, minRaacAmountInWei, minPairedAmountInWei, {
      maxFeePerGas,
      maxPriorityFeePerGas
    });
    console.log(`Withdraw transaction sent to liquidity pool:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Withdrawn ${lpAmount} LP tokens from liquidity pool successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Withdraw error:`, error);
    throw new Error(`Withdraw from liquidity pool failed: ${error.message}`);
  }
};

export default withdrawFromLiquidityPool;