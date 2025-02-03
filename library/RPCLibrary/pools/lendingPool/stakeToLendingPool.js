import { ethers } from 'ethers';
import { getContractAddress } from '../../contracts/getContractAddress.js';

async function stakeToLendingPool(chainId, tokenId, signer) {
  try {
    const lendingPoolAddress = await getContractAddress(chainId, 'lendingpool');
    const nftAddress = await getContractAddress(chainId, 'raacnft');

    const nftABI = [
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function approve(address to, uint256 tokenId) external"
    ];
    const lendingPoolABI = [
      "function stakeNFT(uint256 _tokenId) external"
    ];

    const nftContract = new ethers.Contract(nftAddress, nftABI, signer);
    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolABI, signer);

    const owner = await nftContract.ownerOf(tokenId);
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      throw new Error(`Signer does not own NFT #${tokenId}`);
    }

    const approveTx = await nftContract.approve(lendingPoolAddress, tokenId);
    await approveTx.wait();
    console.log(`Approved lending pool to transfer NFT #${tokenId}`);

    const stakeTx = await lendingPoolContract.stakeNFT(tokenId);
    const receipt = await stakeTx.wait();

    console.log(`Staked NFT #${tokenId} to the lending pool`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);

    return receipt;
  } catch (error) {
    console.error('Error in stakeToLendingPool:', error);
    throw error;
  }
}

export default stakeToLendingPool;