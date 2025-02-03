import { getContractAddress } from '../../contracts/getContractAddress.js';
import { ethers } from 'ethers';
import RAACLendingPoolArtifact from '../../artifacts/LendingPool/RAACLendingPool.sol/RAACLendingPool.json' assert { type: "json" };

const getUserLoanData = async (chainId, tokenId, provider) => {
  const contractAddress = getContractAddress(chainId, 'lendingpool');
  const contract = new ethers.Contract(contractAddress, RAACLendingPoolArtifact.abi, provider);

  try {
    const loanData = await contract.getLoanData(tokenId);
    return {
      borrower: loanData.borrower,
      amount: ethers.formatEther(loanData.amount),
      startTime: loanData.startTime.toString(),
      lastUpdateTime: loanData.lastUpdateTime.toString()
    };
  } catch (error) {
    console.error(`Error fetching user loan data:`, error);
    throw new Error(`Failed to fetch user loan data: ${error.message}`);
  }
};

export default getUserLoanData;