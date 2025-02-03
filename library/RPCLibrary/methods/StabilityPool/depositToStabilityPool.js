import { ethers } from 'ethers';
import { getContractAddress } from '../../contracts/getContractAddress.js';
import RAACStabilityPoolArtifact from '../../artifacts/StabilityPool/StabilityPool.sol/StabilityPool.json' assert { type: "json" };

const depositToStabilityPool = async (chainId, stabilityPoolAddress, tokenAddress, amount, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  const stabilityPool = new ethers.Contract(stabilityPoolAddress, RAACStabilityPoolArtifact.abi, signer);

  try {
    const amountInWei = ethers.parseEther(amount.toString());
    const tx = await stabilityPool.deposit(amountInWei);
    console.log(`Deposit transaction sent to stability pool:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Deposited ${amount} to stability pool successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Deposit error:`, error);
    throw new Error(`Deposit to stability pool failed: ${error.message}`);
  }
};

export default depositToStabilityPool;