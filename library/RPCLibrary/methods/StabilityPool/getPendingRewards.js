import { ethers } from 'ethers';
import StabilityPoolArtifact from '../../artifacts/StabilityPool/StabilityPool.sol/StabilityPool.json' assert { type: "json" };

const getPendingRewards = async (chainId, stabilityPoolAddress, userAddress, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  const contract = new ethers.Contract(stabilityPoolAddress, StabilityPoolArtifact.abi, signer);

  try {
    const pendingRewards = await contract.getPendingRewards(userAddress);
    return ethers.formatEther(pendingRewards);
  } catch (error) {
    console.error(`Error fetching pending rewards:`, error);
    throw new Error(`Failed to fetch pending rewards: ${error.message}`);
  }
};

export default getPendingRewards;