import { getContractAddress } from '../../contracts/getContractAddress.js';
import { ethers } from 'ethers';
import RAACStabilityPoolArtifact from '../../artifacts/StabilityPool/StabilityPool.sol/StabilityPool.json' assert { type: "json" };

const getPendingRewardsFromStabilityPool = async (chainId, address, signer) => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    const contractAddress = getContractAddress(chainId, 'stabilitypool');
    const contract = new ethers.Contract(contractAddress, RAACStabilityPoolArtifact.abi, signer);

    try {
      const pendingRewards = await contract.calculateRaacRewards(address);
      return ethers.formatEther(pendingRewards);
    } catch (error) {
      console.error(`Error fetching pending rewards from stability pool:`, error);
      throw new Error(`Failed to fetch pending rewards from stability pool: ${error.message}`);
    }
  };

  export default getPendingRewardsFromStabilityPool;