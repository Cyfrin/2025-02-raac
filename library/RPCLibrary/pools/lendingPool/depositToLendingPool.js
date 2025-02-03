import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';
import estimateGasPrice from '../../methods/commons/estimateGasPrice.js';

async function depositToLendingPool(chainId, amount, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    const assetAddress = getContractAddress(chainId, 'rcrvusd');
    const lendingPoolABI = getABI('lendingpool');
    const assetABI = getABI('rcrvusd');

    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolABI, signer);
    const assetContract = new ethers.Contract(assetAddress, assetABI, signer);

    const amountInWei = ethers.parseEther(amount);
    const { maxFeePerGas } = await estimateGasPrice(signer);

    const depositTx = await lendingPoolContract.deposit(amountInWei.toString(), {
      maxFeePerGas,
      nonce: await signer.getNonce()
    });

    console.log(`Deposit transaction sent for rcrvusd:`, depositTx.hash);
    const receipt = await depositTx.wait();
    console.log(`Deposited ${amount} rcrvusd to lending pool successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Lending Pool Deposit error:`, error);
    throw new Error(`Lending Pool Deposit failed: ${error.message}`);
  }
}

export default depositToLendingPool;