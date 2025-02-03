import { ethers } from 'ethers';
import getContractAddress from './getContractAddress.js';

export default async function getContract(chainId, contractId, signer) {
    if(!signer) {
        throw new Error('Signer is required');
    }
    const contractAddress = getContractAddress(chainId, contractId);
    
    // You'll need to import the ABI for the contract. This is just a placeholder.
    const abi = []; // Replace with actual ABI

    const contract = new ethers.Contract(contractAddress, abi, signer);
    return contract;
}