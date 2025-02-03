import { ethers } from 'ethers';
import { getContractAddress } from '../../contracts/getContractAddress.js';
import StabilityPoolArtifact from '../../artifacts/StabilityPool/StabilityPool.sol/StabilityPool.json' assert { type: "json" };

const getStabilityPoolInfo = async (chainId, userAddress, provider) => {

  const contractAddress = getContractAddress(chainId, 'stabilitypool');
  const contract = new ethers.Contract(contractAddress, StabilityPoolArtifact.abi, provider);

  try {
    const [totalDeposits, userDeposit, pendingRewards] = await Promise.all([
      contract.getTotalDeposits(),
      contract.getUserDeposit(userAddress),
      contract.getPendingRewards(userAddress)
    ]);

    return {
      totalDeposits: ethers.formatEther(totalDeposits),
      userDeposit: ethers.formatEther(userDeposit),
      pendingRewards: ethers.formatEther(pendingRewards)
    };
  } catch (error) {
    console.error('Error fetching stability pool info:', error);
    throw error;
  }
};

export default getStabilityPoolInfo;

export { getStabilityPoolInfo };