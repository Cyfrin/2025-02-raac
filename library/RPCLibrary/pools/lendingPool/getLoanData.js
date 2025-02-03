import { ethers } from 'ethers';
import { getContractAddress } from '../../contracts/getContractAddress.js';

async function getLoanData(chainId, tokenId, signer) {
  try {
    const lendingPoolAddress = await getContractAddress(chainId, 'lendingpool');
    const lendingPoolABI = [
      "function getLoanData(uint256 _tokenId) external view returns (tuple(address tokenOwner, address borrower, bool isApproved, uint256 borrowLimit, uint256 bor, uint256 borrowIndex))"
    ];

    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolABI, signer);

    const loanData = await lendingPoolContract.getLoanData(tokenId);

    return {
      tokenOwner: loanData.tokenOwner,
      borrower: loanData.borrower,
      isApproved: loanData.isApproved,
      borrowLimit: ethers.formatEther(loanData.borrowLimit).toString(),
      borrowedAmount: ethers.formatEther(loanData.bor).toString(),
      borrowIndex: ethers.formatEther(loanData.borrowIndex).toString()
    };
  } catch (error) {
    console.error('Error in getLoanData:', error);
    throw error;
  }
}

export default getLoanData;