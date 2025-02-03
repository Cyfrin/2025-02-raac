import { ethers } from "ethers";
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';

async function getBalance(chainId, assetId, address, provider) {
    const BALANCE_OF_ABI = ['function balanceOf(address) view returns (uint256)'];
    try {
      if(assetId === 'eth') {
        const balance = await provider.getBalance(address);
        const parsedBalance = parseFloat(ethers.formatEther(balance));
        return  parsedBalance;
      }
      const contractAddress = getContractAddress(chainId, assetId); 
        const contract = new ethers.Contract(contractAddress, BALANCE_OF_ABI, provider);
        const balance = await contract.balanceOf(address)
        const parsedBalance = parseFloat(ethers.formatEther(balance));
        return parsedBalance.toString();
      } catch (error) {
        console.error(`Error getting balance for asset ${assetId}:`, error);
        return 0;
    }
}

export default getBalance;