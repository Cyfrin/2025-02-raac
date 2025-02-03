import { ethers } from 'ethers';
import { getConfig } from '../../utils/contracts.js';
import estimateGasPrice from '../../methods/commons/estimateGasPrice.js';
import { getABI } from '../../utils/artifacts.js';

async function transferAsset(chainId, assetId, amount, fromAddress, toAddress, signer) {
    try {
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        const { maxFeePerGas } = await estimateGasPrice(signer);
        const amountToTransfer = ethers.parseEther(amount);

        if (assetId.toLowerCase() === 'eth') {
            // Handle ETH transfer
            const tx = await signer.sendTransaction({
                to: toAddress,
                value: amountToTransfer,
                maxFeePerGas,
                nonce: await signer.getNonce()
            });

            console.log(`ETH transfer transaction sent:`, tx.hash);
            const receipt = await tx.wait();
            console.log(`Transferred ${amount} ETH from ${fromAddress} to ${toAddress} successfully:`, receipt.transactionHash);
            return receipt;
        } else {
            // Handle ERC20 token transfer
            const { assets } = getConfig(chainId);
            const asset = Object.values(assets).find(asset => asset.id.toLowerCase() === assetId.toLowerCase());
            if (!asset) {
                throw new Error(`Asset ${assetId} not found on chain ${chainId}`);
            }

            const contractAddress = asset.contract;
            const abi = getABI(assetId);
            const contract = new ethers.Contract(contractAddress, abi, signer);

            if(!contract.transfer) {
                throw new Error(`Transfer function not found on contract ${contractAddress}`);
            }

            const tx = await contract.transfer(toAddress, amountToTransfer, { 
                maxFeePerGas,
                nonce: await signer.getNonce()
            });

            console.log(`Transfer transaction sent for ${assetId}:`, tx.hash);
            const receipt = await tx.wait();
            console.log(`Transferred ${amount} ${assetId} from ${fromAddress} to ${toAddress} successfully:`, receipt.transactionHash);
            return receipt;
        }
    } catch (error) {
        console.error(`Error transferring asset ${assetId}:`, error);
        throw new Error(`Transfer failed for ${assetId}: ${error.message}`);
    }
}

export default transferAsset;