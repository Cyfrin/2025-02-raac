import { ethers } from 'ethers';
import { getContractAddress } from '../../contracts/getContractAddress.js';
import { getABI } from '../../utils/artifacts.js';
async function repayToLendingPool(chainId, tokenId, amount, signer) {
  try {
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    const crvUSDAddress = getContractAddress(chainId, 'rcrvusd');
    const lendingPoolABI = getABI('lendingpool');
    const crvUSDABI = getABI('crvusd');

    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolABI, signer);
    const crvUSDTokenContract = new ethers.Contract(crvUSDAddress, crvUSDABI, signer);

    const approveTx = await crvUSDTokenContract.approve(lendingPoolAddress, amount);
    await approveTx.wait();
    console.log(`Approved lendingPoolContract to spend ${ethers.formatEther(amount)} crvUSD`);
    const tx = await lendingPoolContract.repay(amount);
    const receipt = await tx.wait();

    console.log(`Repaid ${ethers.formatEther(amount)} for NFT #${tokenId}`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);

    return receipt;
  } catch (error) {
    console.error('Error in repayToLendingPool:', error);
    throw error;
  }
}

export default repayToLendingPool;