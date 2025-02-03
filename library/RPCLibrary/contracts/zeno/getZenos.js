import { ethers } from "ethers";
import { getContractAddress } from "../../utils/contracts.js";
import { getABI } from "../../utils/artifacts.js";

async function getZenos(chainId, signer) {
    if (!signer) {
        throw new Error('Wallet not connected');
    }

    try {
        const zenoAddress = getContractAddress(chainId, 'zeno');
        const zenoABI = getABI('zeno');

        const zenoContract = new ethers.Contract(zenoAddress, zenoABI, signer);

        const zenosCount = await zenoContract.getZENOCount();
        const zenos = [];

        for (let i = 0; i < zenosCount; i++) {
            const zeno = await zenoContract.getZENODetails(i);
            zenos.push(zeno);
        }

        console.log(`Zenos: ${
            zenos
        }`);

        return zenos;
    } catch(error) {
        console.error('Error getting zenos:', error);
        throw new Error(`Failed to get zenos: ${error.message}`);
    }
}

export default getZenos;