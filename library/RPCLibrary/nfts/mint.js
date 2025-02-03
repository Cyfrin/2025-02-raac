import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';

async function mint(chainId, tokenId, amount, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const raacNFTAddress = getContractAddress(chainId, 'raacnft');
    const raacNFTABI = getABI('raacnft');

    const raacNFTContract = new ethers.Contract(raacNFTAddress, raacNFTABI, signer);

    const tx = await raacNFTContract.mint(tokenId, ethers.parseEther(amount.toString()));
    await tx.wait();

    console.log(`Minted RAAC NFT with token ID ${tokenId} for ${amount} tokens`);
    return tx;
  } catch (error) {
    console.error('Error minting RAAC NFT:', error);
    throw new Error(`Failed to mint RAAC NFT: ${error.message}`);
  }
}

export default mint;