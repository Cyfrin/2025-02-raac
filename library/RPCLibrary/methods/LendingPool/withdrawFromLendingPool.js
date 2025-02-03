import { getContractAddress } from '../../contracts/getContractAddress.js';
import estimateGasPrice from '../commons/estimateGasPrice.js';
import { ethers } from 'ethers';
import RAACLendingPoolArtifact from '../../artifacts/LendingPool/RAACLendingPool.sol/RAACLendingPool.json' assert { type: "json" };

const withdrawFromLendingPool = async (chainId, amount, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  const contractAddress = getContractAddress(chainId, 'lendingpool');
  const contract = new ethers.Contract(contractAddress, RAACLendingPoolArtifact.abi, signer);

  try {
    const amountInWei = ethers.parseEther(amount);
    const { maxFeePerGas, maxPriorityFeePerGas } = await estimateGasPrice(signer);
    
    const tx = await contract.withdraw(amountInWei.toString(), { 
      maxFeePerGas,
      maxPriorityFeePerGas
    });
    console.log(`Withdraw transaction sent to lending pool:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Withdrawn ${amount} from lending pool successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Withdraw error:`, error);
    console.log('error', error.stack);
    throw new Error(`Withdraw from lending pool failed: ${error.message}`);
  }
};

export default withdrawFromLendingPool;