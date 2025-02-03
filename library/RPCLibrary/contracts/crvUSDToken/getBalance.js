import { ethers } from 'ethers';
import configs from '@/configs/chains';

const BALANCE_OF_ABI = 'function balanceOf(address account) view returns (uint256)';

export const getBalance = async (chainId, contractAddress, address) => {
  const rpc = configs[chainId].rpc;
  const provider = new ethers.JsonRpcProvider(rpc);

  const contract = new ethers.Contract(contractAddress, [BALANCE_OF_ABI], provider);
  const balance = await contract.balanceOf(address);
  return ethers.formatEther(balance);
};