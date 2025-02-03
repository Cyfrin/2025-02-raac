import { getContractAddress } from '../../contracts/getContractAddress.js';
import estimateGasPrice from '../commons/estimateGasPrice.js';
import { ethers } from 'ethers';
import StabilityPoolArtifact from '../../artifacts/StabilityPool/StabilityPool.sol/StabilityPool.json' assert { type: "json" };

const withdrawFromStabilityPool = async (chainId, amount, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  const contractAddress = getContractAddress(chainId, 'stabilitypool');
  const contract = new ethers.Contract(contractAddress, StabilityPoolArtifact.abi, signer);

  try {
    const amountInWei = ethers.parseEther(amount);
    const { maxFeePerGas, maxPriorityFeePerGas } = await estimateGasPrice(signer);
    
    const tx = await contract.withdraw(amountInWei, {
      maxFeePerGas,
      maxPriorityFeePerGas
    });
    console.log(`Withdraw transaction sent to stability pool:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Withdrawn ${amount} from stability pool successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Withdraw error:`, error);
    throw new Error(`Withdraw from stability pool failed: ${error.message}`);
  }
};

export default withdrawFromStabilityPool;