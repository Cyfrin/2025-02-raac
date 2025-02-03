import { ethers } from "ethers";
import { getContractAddress } from "../../utils/contracts.js";
import { getABI } from "../../utils/artifacts.js";

async function getAuctions(chainId, signer) {
    if (!signer) {
        throw new Error('Wallet not connected');
    }

    try {
        const auctionFactoryAddress = getContractAddress(chainId, 'auctionfactory');
        const auctionFactoryABI = getABI('auctionfactory');

        const auctionFactoryContract = new ethers.Contract(auctionFactoryAddress, auctionFactoryABI, signer);

        const auctionsCount = await auctionFactoryContract.getAuctionCount();
        const auctions = [];

        for (let i = 0; i < auctionsCount; i++) {
            const auctionAddress = await auctionFactoryContract.getAuctionDetails(i);
            auctions.push(auctionAddress);
        }

        console.log(`Auctions: ${
            auctions
        }`);

        return auctions;

    } catch(error) {
        console.error('Error getting auctions:', error);
        throw new Error(`Failed to get auctions: ${error.message}`);
    }
}

export default getAuctions;