import { ethers } from 'ethers';
import { getConfig } from '../../utils/contracts.js';
import estimateGasPrice from '../../methods/commons/estimateGasPrice.js';
import { getABI } from '../../utils/artifacts.js';

async function burnAsset(chainId, assetId, amount, signer) {
    try {
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        const { assets } = getConfig(chainId);
        const asset = Object.values(assets).find(asset => asset.id.toLowerCase() === assetId.toLowerCase());
        if (!asset) {
            throw new Error(`Asset ${assetId} not found on chain ${chainId}`);
        }

        const contractAddress = asset.contract;
        const abi = getABI(assetId);
        const contract = new ethers.Contract(contractAddress, abi, signer);
        
        const { maxFeePerGas } = await estimateGasPrice(signer);
        const amountToBurn = ethers.parseEther(amount);

        if(!contract.burn) {
            throw new Error(`Burn function not found on contract ${contractAddress}`);
        }

        const tx = await contract.burn(amountToBurn, { 
            maxFeePerGas,
            nonce: +await signer.getNonce()
        });

        console.log(`Burning transaction sent for ${assetId}:`, tx.hash);
        const receipt = await tx.wait();
        console.log(`Burned ${amount} ${assetId} successfully:`, receipt.transactionHash);
        return receipt;
    } catch (error) {
        console.error(`Error burning asset ${assetId}:`, error);
        throw new Error(`Burning failed for ${assetId}: ${error.message}`);
    }
}

export default burnAsset;