import { ethers } from "ethers";
import { getContractAddress } from '../../utils/contracts.js';

async function getAllowance(chainId, assetId, owner, spender, provider) {
    try {
        if (assetId === 'eth') {
            // ETH doesn't have an allowance concept, return max uint256 value ?
            return ethers.formatEther(ethers.MaxUint256);
        }

        const ALLOWANCE_ABI = ['function allowance(address,address) view returns (uint256)'];
        const contractAddress = getContractAddress(chainId, assetId);
        const contract = new ethers.Contract(contractAddress, ALLOWANCE_ABI, provider);
        const allowance = await contract.allowance(owner, spender);
        return ethers.formatEther(allowance);
    } catch (error) {
        console.error(`Error getting allowance for asset ${assetId}:`, error);
        console.log({assetId, owner, spender});
        console.log(error);
        return 0;
    }
}

export default getAllowance;
