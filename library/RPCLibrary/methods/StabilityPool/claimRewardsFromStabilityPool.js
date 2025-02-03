import { getContractAddress } from '../../contracts/getContractAddress.js';
import estimateGasPrice from '../commons/estimateGasPrice.js';
import { ethers } from 'ethers';
import StabilityPoolArtifact from '../../artifacts/StabilityPool/StabilityPool.sol/StabilityPool.json' assert { type: "json" };

const claimRewardsFromStabilityPool = async (chainId, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  const contractAddress = getContractAddress(chainId, 'stabilitypool');
  const contract = new ethers.Contract(contractAddress, StabilityPoolArtifact.abi, signer);

  try {
    const { maxFeePerGas, maxPriorityFeePerGas } = await estimateGasPrice(signer);
    
    const userDeposit = await contract.getUserDeposit(await signer.getAddress());
    // With a small amount, see for claimReward method.
    const withdrawAmount = ethers.parseUnits('1', 'wei');
    
    if (userDeposit.lt(withdrawAmount)) {
      throw new Error('Insufficient deposit to claim rewards');
    }

  //   const tx = await contract.claimRewards({
  //     maxFeePerGas,
  //     maxPriorityFeePerGas
  //   });
  //   console.log(`Claim rewards transaction sent to stability pool:`, tx.hash);

    const tx = await contract.withdraw(withdrawAmount, {
      maxFeePerGas,
      maxPriorityFeePerGas
    });
    console.log(`Claim rewards transaction sent to stability pool:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Claimed rewards from stability pool successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Claim rewards error:`, error);
    throw new Error(`Claim rewards from stability pool failed: ${error.message}`);
  }
};

export default claimRewardsFromStabilityPool;