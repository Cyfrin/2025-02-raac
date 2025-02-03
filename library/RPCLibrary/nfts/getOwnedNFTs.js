import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';

async function getOwnedNFTs(chainId, address, provider) {
  try {
    const raacNFTAddress = getContractAddress(chainId, 'raacnft');
    const raacNFTABI = getABI('raacnft');

    const raacNFTContract = new ethers.Contract(raacNFTAddress, raacNFTABI, provider);

    const ownedTokens = [];

    try {
        const balance = await raacNFTContract.balanceOf(address);

        for (let i = 0; i < balance; i++) {
            try {
                const tokenId = await raacNFTContract.tokenOfOwnerByIndex(address, i);
                ownedTokens.push(tokenId.toString());
            } catch (error) {
                console.error('Error getting owned NFTs:', error);
                }
        }
    } catch (error) {
        console.error('Error getting owned NFTs:', error);
    }


    return {address, ownedTokens};
  } catch (error) {
    console.error('Error getting owned NFTs:', error);
    throw new Error(`Failed to get owned NFTs: ${error.message}`);
  }
}

export default getOwnedNFTs;