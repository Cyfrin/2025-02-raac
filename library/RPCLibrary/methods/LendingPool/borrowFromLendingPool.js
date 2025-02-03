import { getContractAddress } from '../../contracts/getContractAddress.js';
import estimateGasPrice from '../commons/estimateGasPrice.js';
import { ethers } from 'ethers';
import RAACLendingPoolArtifact from '../../artifacts/LendingPool/RAACLendingPool.sol/RAACLendingPool.json' assert { type: "json" };

const borrowFromLendingPool = async (chainId, tokenId, amount, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  const contractAddress = getContractAddress(chainId, 'lendingpool');
  const contract = new ethers.Contract(contractAddress, RAACLendingPoolArtifact.abi, signer);

  try {
    const amountInWei = ethers.parseEther(amount);
    const { maxFeePerGas } = await estimateGasPrice(signer);
    
    const tx = await contract.borrow(tokenId, amountInWei, { 
      maxFeePerGas,
      // maxPriorityFeePerGas
    });
    console.log(`Borrow transaction sent to lending pool:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Borrowed ${amount} from lending pool successfully for token ${tokenId}:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Borrow error:`, error);
    throw new Error(`Borrow from lending pool failed: ${error.message}`);
  }
};

export default borrowFromLendingPool;