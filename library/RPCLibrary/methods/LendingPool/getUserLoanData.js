import { getContractAddress } from '../../contracts/getContractAddress.js';
import { ethers } from 'ethers';
import RAACLendingPoolArtifact from '../../artifacts/LendingPool/RAACLendingPool.sol/RAACLendingPool.json' assert { type: "json" };

const getUserLoanData = async (chainId, userAddress, provider) => {
  const contractAddress = getContractAddress(chainId, 'lendingpool');
  const contract = new ethers.Contract(contractAddress, RAACLendingPoolArtifact.abi, provider);

  try {
    const loanData = await contract.getLoan(userAddress);
    return {
      tokenOwner: loanData.tokenOwner,
      initiator: loanData.initiator,
      isApproved: loanData.isApproved,
      borrowLimit: ethers.formatEther(loanData.borrowLimit),
      bor: ethers.formatEther(loanData.bor),
      borrowIndex: ethers.formatEther(loanData.borrowIndex)
    };
  } catch (error) {
    console.error(`Error fetching user loan data:`, error);
    throw new Error(`Failed to fetch user loan data: ${error.message}`);
  }
};

export default getUserLoanData;