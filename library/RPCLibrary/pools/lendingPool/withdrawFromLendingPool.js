import { ethers } from 'ethers';
import { getContractAddress } from '../../contracts/getContractAddress.js';
import { getABI } from '../../utils/artifacts.js';
import estimateGasPrice from '../../methods/commons/estimateGasPrice.js';
async function withdrawFromLendingPool(chainId, amount, signer) {
  try {
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    const rtokenAddress = getContractAddress(chainId, 'rtoken');
    const lendingPoolABI = getABI('lendingpool');
    const assetABI = getABI('rtoken');

    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolABI, signer);
    const rTokenContract = new ethers.Contract(rtokenAddress, assetABI, signer);

    const amountInWei = ethers.parseEther(amount);
    const { maxFeePerGas } = await estimateGasPrice(signer);

    const userBalance = await rTokenContract.balanceOf(signer.address);
    if (userBalance < amount) {
      throw new Error(`Insufficient rcrvUSD balance. Available: ${ethers.formatEther(userBalance)}, Requested: ${ethers.formatEther(amount)}`);
    }

    const approveTx = await rTokenContract.approve(lendingPoolAddress, amount);
    await approveTx.wait();
    console.log(`Approved LendingPool to spend ${ethers.formatEther(amount)} rcrvUSD`);


    // const withdraw = await lendingPoolContract.withdraw(amountInWei.toString(), {
      // maxFeePerGas,
      // nonce: await signer.getNonce()
    // });

    const tx = await lendingPoolContract.withdraw(amount);
    const receipt = await tx.wait();

    console.log(`Withdrawn ${ethers.formatEther(amount)} from Lending Pool`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);

    return receipt;
  } catch (error) {
    console.error('Error in withdrawFromLendingPool:', error);
    throw error;
  }
}

export default withdrawFromLendingPool;