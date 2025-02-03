import { getContractAddress } from '../../contracts/getContractAddress.js';
import estimateGasPrice from '../commons/estimateGasPrice.js';
import { ethers } from 'ethers';
import LiquidityPoolArtifact from '../../artifacts/LiquidityPool/LiquidityPool.sol/LiquidityPool.json' assert { type: "json" };

const addLiquidityToPool = async (chainId, pairedToken, raacAmount, pairedAmount, minLPAmount, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  const contractAddress = getContractAddress(chainId, 'liquiditypool');
  const contract = new ethers.Contract(contractAddress, LiquidityPoolArtifact.abi, signer);

  try {
    const raacAmountInWei = ethers.parseEther(raacAmount);
    const pairedAmountInWei = ethers.parseEther(pairedAmount);
    const minLPAmountInWei = ethers.parseEther(minLPAmount);
    const { maxFeePerGas, maxPriorityFeePerGas } = await estimateGasPrice(signer);

    const tx = await contract.addLiquidity(pairedToken, raacAmountInWei, pairedAmountInWei, minLPAmountInWei, {
      maxFeePerGas,
      maxPriorityFeePerGas
    });
    console.log(`Add liquidity transaction sent:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Added liquidity successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Add liquidity error:`, error);
    throw new Error(`Failed to add liquidity: ${error.message}`);
  }
};

export default addLiquidityToPool;