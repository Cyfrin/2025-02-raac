import { ethers } from "ethers";
import { getContractAddress } from "../../utils/contracts.js";
import { getABI } from "../../utils/artifacts.js";


async function createAuction(chainId, zenoAddress, usdcAddress, businessAddress, auctionStartTime, auctionEndTime, startingPrice, reservePrice, totalZenoAllocated, signer) {
    if (!signer) {
        throw new Error('Wallet not connected');
    }

    try {
        const auctionFactoryAddress = getContractAddress(chainId, 'auctionfactory');
        const auctionFactoryABI = getABI('auctionfactory');

        const auctionFactoryContract = new ethers.Contract(auctionFactoryAddress, auctionFactoryABI, signer);

        const tx = await auctionFactoryContract.createAuction(zenoAddress, usdcAddress, businessAddress, auctionStartTime, auctionEndTime, startingPrice, reservePrice, totalZenoAllocated);
        await tx.wait();

        const auctionsCount = await auctionFactoryContract.auctionsCount();
        const auctionAddress = await auctionFactoryContract.getAuction(auctionsCount - 1);

        console.log(`Zeno auction created at address: ${
            auctionAddress
        }`);

    } catch(error) {
        console.error('Error creating zeno auction:', error);
        throw new Error(`Failed to create zeno auction: ${error.message}`);
    }
}

export default createAuction;