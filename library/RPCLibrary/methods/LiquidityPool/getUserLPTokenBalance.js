import { getContractAddress } from '../../contracts/getContractAddress.js';
import { ethers } from 'ethers';
import LiquidityPoolArtifact from '../../artifacts/LiquidityPool/LiquidityPool.sol/LiquidityPool.json' assert { type: "json" };

const getUserLPTokenBalance = async (chainId, pairedToken, userAddress, provider) => {
  const contractAddress = getContractAddress(chainId, 'liquiditypool');
  const contract = new ethers.Contract(contractAddress, LiquidityPoolArtifact.abi, provider);

  try {
    const lpTokenBalance = await contract.balanceOf(pairedToken, userAddress);
    return ethers.formatEther(lpTokenBalance);
  } catch (error) {
    console.error(`Error fetching user LP token balance:`, error);
    throw new Error(`Failed to fetch user LP token balance: ${error.message}`);
  }
};

export default getUserLPTokenBalance;