import { ethers } from 'ethers';
import { getContractAddress } from '../../contracts/getContractAddress.js';
import { getABI } from '../../utils/artifacts.js';
import estimateGasPrice from '../../methods/commons/estimateGasPrice.js';

async function depositNFTToLendingPool(chainId, tokenId, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    const nftAddress = getContractAddress(chainId, 'raacnft');
    const lendingPoolABI = getABI('lendingpool');
    const nftABI = getABI('raacnft');

    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolABI, signer);
    const nftContract = new ethers.Contract(nftAddress, nftABI, signer);

    const { maxFeePerGas } = await estimateGasPrice(signer);

    // Check if the signer owns the NFT
    const owner = await nftContract.ownerOf(tokenId);
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      throw new Error(`Signer does not own NFT #${tokenId}`);
    }

    // Approve the lending pool to transfer the NFT
    const approveTx = await nftContract.approve(lendingPoolAddress, tokenId, {
      maxFeePerGas,
      nonce: await signer.getNonce()
    });
    await approveTx.wait();
    console.log(`Approved lending pool to transfer NFT #${tokenId}`);

    console.log(lendingPoolContract);
    // Deposit (stake) the NFT
    const depositTx = await lendingPoolContract.depositNFT(tokenId, {
      maxFeePerGas,
      nonce: await signer.getNonce()
    });

    console.log(`Deposit transaction sent for NFT #${tokenId}:`, depositTx.hash);
    const receipt = await depositTx.wait();
    console.log(`Deposited NFT #${tokenId} to lending pool successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`NFT Deposit to Lending Pool error:`, error);
    throw new Error(`NFT Deposit to Lending Pool failed: ${error.message}`);
  }
}

export default depositNFTToLendingPool;