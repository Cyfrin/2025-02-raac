import { getContractAddress } from '../../contracts/getContractAddress.js';
import { ethers } from 'ethers';
import StabilityPoolArtifact from '../../artifacts/StabilityPool/StabilityPool.sol/StabilityPool.json' assert { type: "json" };

const getTotalStabilityPoolDeposits = async (chainId, provider) => {
  const contractAddress = getContractAddress(chainId, 'stabilitypool');
  const contract = new ethers.Contract(contractAddress, StabilityPoolArtifact.abi, provider);

  try {
    const totalDeposits = await contract.getTotalDeposits();
    return ethers.formatEther(totalDeposits);
  } catch (error) {
    console.error(`Error fetching total stability pool deposits:`, error);
    throw new Error(`Failed to fetch total stability pool deposits: ${error.message}`);
  }
};

export default getTotalStabilityPoolDeposits;