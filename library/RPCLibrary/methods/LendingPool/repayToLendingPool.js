import { ethers } from 'ethers';
import { getContractAddress } from '../contracts/getContractAddress.js';

async function repayToLendingPool(chainId, tokenId, amount, signer) {
  try {
    const raacVaultAddress = await getContractAddress(chainId, 'raacvault');
    const crvUSDAddress = await getContractAddress(chainId, 'crvusd');
    const raacVaultABI = [
      "function repay(uint256 _tokenId, uint256 _amount) external"
    ];
    const crvUSDTokenABI = [
      "function approve(address spender, uint256 amount) external returns (bool)"
    ];

    const raacVaultContract = new ethers.Contract(raacVaultAddress, raacVaultABI, signer);
    const crvUSDTokenContract = new ethers.Contract(crvUSDAddress, crvUSDTokenABI, signer);

    // Approve RAACVault to spend crvUSD
    const approveTx = await crvUSDTokenContract.approve(raacVaultAddress, amount);
    await approveTx.wait();
    console.log(`Approved RAACVault to spend ${ethers.formatEther(amount)} crvUSD`);

    // Repay the loan
    const tx = await raacVaultContract.repay(tokenId, amount);
    const receipt = await tx.wait();

    console.log(`Repaid ${ethers.formatEther(amount)} for NFT #${tokenId}`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);

    return receipt;
  } catch (error) {
    console.error('Error in repayToLendingPool:', error);
    throw error;
  }
}

export default repayToLendingPool;