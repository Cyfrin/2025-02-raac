import { ethers } from "ethers";
import { getContractAddress } from '../utils/contracts.js';

async function getSupply(chainId, assetId, provider) {

    try {
        const SUPPLY_ABI = ['function totalSupply() view returns (uint256)'];
        const contractAddress = getContractAddress(chainId, assetId);
        const contract = new ethers.Contract(contractAddress, SUPPLY_ABI, provider);
        const supply = await contract.totalSupply();
        return ethers.formatEther(supply);
    } catch (error) {
        console.error(`Error getting supply for asset ${assetId}:`, error);
        return 0;
    }
}

export default getSupply;