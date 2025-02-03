import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';

async function withdrawNFTFromLendingPool(chainId, tokenId, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    const lendingPoolABI = getABI('lendingpool');

    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolABI, signer);

    const tx = await lendingPoolContract.unstakeNFT(tokenId);
    await tx.wait();

    console.log(`Withdrawn NFT with token ID ${tokenId} from lending pool`);
    return tx;
  } catch (error) {
    console.error('Error withdrawing NFT from lending pool:', error);
    throw new Error(`Failed to withdraw NFT from lending pool: ${error.message}`);
  }
}

export default withdrawNFTFromLendingPool;