import { ethers } from 'ethers';
import { getContractAddress } from '../../contracts/getContractAddress.js';
import { getABI } from '../../utils/artifacts.js';

async function borrowFromLendingPool(chainId, tokenId, amount, signer) {
  try {
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    const lendingPoolABI = getABI('lendingpool');

    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolABI, signer);

    const tx = await lendingPoolContract.borrow(amount);
    const receipt = await tx.wait();

    console.log(`Borrowed ${ethers.formatEther(amount)} against NFT #${tokenId}`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);

    return receipt;
  } catch (error) {
    console.error('Error in borrowFromLendingPool:', error);
    throw error;
  }
}

export default borrowFromLendingPool;