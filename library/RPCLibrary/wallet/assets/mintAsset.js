import { ethers } from 'ethers';
import { getConfig } from '../../utils/contracts.js';
import estimateGasPrice from '../../methods/commons/estimateGasPrice.js';
import { getABI } from '../../utils/artifacts.js';

async function mintAsset(chainId, assetId, amount, address, signer) {
    try {
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        const { assets } = getConfig(chainId);
        console.log('assets', assets);
        const asset = Object.values(assets).find(asset => asset.id.toLowerCase() === assetId.toLowerCase());
        if (!asset) {
            throw new Error(`Asset ${assetId} not found on chain ${chainId}`);
        }

        const contractAddress = asset.contract;
        let contract;

        const abi = getABI(assetId);
        contract = new ethers.Contract(contractAddress, abi, signer);
        
        const { maxFeePerGas } = await estimateGasPrice(signer);
        if(!contract.mint) {
            throw new Error(`Mint function not found on contract ${contractAddress}`);
        }
        const tx = await contract.mint(address, ethers.parseEther(amount), { 
            maxFeePerGas,
            nonce: +await signer.getNonce()
        });

        console.log(`Minting transaction sent for ${assetId}:`, tx.hash);
        const receipt = await tx.wait();
        console.log(`Minted ${amount} ${assetId} successfully:`, receipt.transactionHash);
        return receipt;
    } catch (error) {
        console.error(`Error minting asset ${assetId}:`, error);
        throw new Error(`Minting failed for ${assetId}: ${error.message}`);
    }
}

export default mintAsset;