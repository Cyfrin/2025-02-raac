import { ethers } from "ethers";
import { getContractAddress } from "../../utils/contracts.js";
import { getABI } from "../../utils/artifacts.js";

async function createZeno(chainId, usdcAddress, maturityDate, signer) {
    if (!signer) {
        throw new Error('Wallet not connected');
    }

    try {
        const zenoFactoryAddress = getContractAddress(chainId, 'zenofactory');
        const zenoFactoryABI = getABI('zenofactory');

        const zenoFactoryContract = new ethers.Contract(zenoFactoryAddress, zenoFactoryABI, signer);

        const tx = await zenoFactoryContract.createZeno(usdcAddress, maturityDate);
        await tx.wait();

        const zenosCount = await zenoFactoryContract.zenosCount();
        const zenoAddress = await zenoFactoryContract.getZeno(zenosCount - 1);

        console.log(`Zeno created at address: ${
            zenoAddress
        }`);

        return zenoAddress

    } catch(error) {
        console.error('Error creating zeno:', error);
        throw new Error(`Failed to create zeno: ${error.message}`);
    }
}

export default createZeno;