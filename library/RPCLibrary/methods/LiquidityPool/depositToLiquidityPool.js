import { getContractAddress } from '../../contracts/getContractAddress.js';
import estimateGasPrice from '../commons/estimateGasPrice.js';
import { ethers } from 'ethers';
import LiquidityPoolArtifact from '../../artifacts/LiquidityPool/LiquidityPool.sol/LiquidityPool.json' assert { type: "json" };

const depositToLiquidityPool = async (chainId, amount, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  const contractAddress = getContractAddress(chainId, 'liquiditypool');
  const contract = new ethers.Contract(contractAddress, LiquidityPoolArtifact.abi, signer);

  try {
    const amountInWei = ethers.parseEther(amount);
    const { maxFeePerGas, maxPriorityFeePerGas } = await estimateGasPrice(signer);
    const raacAllowance = await checkAllowance(chainId, 'raacnft', contractAddress, signer);
    const pairedAllowance = await checkAllowance(chainId, 'crvusd', contractAddress, signer);
    
    console.log('RAAC Allowance:', raacAllowance);
    console.log('Paired Allowance:', pairedAllowance);
    console.log('Amount in Wei:', amountInWei.toString());
            
    if (ethers.parseUnits(raacAllowance, 18) < amountInWei || ethers.parseUnits(pairedAllowance, 18) < amountInWei) {
      throw new Error('Insufficient allowance. Please approve the contract to spend your tokens.');
    }
    const address = await signer.getAddress();
    const raacBalance = await getAssetBalance(chainId, address, 'raacnft', signer);
    const pairedBalance = await getAssetBalance(chainId, address, 'crvusd', signer);

    if (ethers.parseEther(raacAllowance) < amountInWei || ethers.parseEther(pairedAllowance) < amountInWei) {
      throw new Error('Insufficient allowance. Please approve the contract to spend your tokens.');
    }

    if (ethers.parseEther(raacAllowance) < amountInWei || ethers.parseEther(pairedAllowance) < amountInWei) {
      throw new Error('Insufficient allowance. Please approve the contract to spend your tokens.');
    }

    if (ethers.parseEther(raacBalance) < amountInWei || ethers.parseEther(pairedBalance) < amountInWei) {
      throw new Error('Insufficient balance. Please check your token balances.');
    }

    const minLPAmount = amountInWei / 2n; 
    const gasOptions = await estimateGasPrice();
    try {
      const tx = await contract.addLiquidity(amountInWei, amountInWei, minLPAmount, gasOptions);
      console.log(`Deposit transaction sent to liquidity pool:`, tx.hash);
      const receipt = await tx.wait();
      console.log(`Deposited ${amount} to liquidity pool successfully:`, receipt.transactionHash);
      return receipt;
    } catch (error) {
      console.error('Detailed error:', error);
      if (error.error && error.error.message) {
        console.error('Error message:', error.error.message);
      }
      throw new Error(`Deposit to liquidity pool failed: ${error.message || error}`);
    }
  } catch (error) {
    console.error(`Deposit error:`, error);
    if (error.reason) {
      throw new Error(`Deposit to liquidity pool failed: ${error.reason}`);
    } else {
      throw new Error(`Deposit to liquidity pool failed: ${error.message}`);
    }
  }
};


export default depositToLiquidityPool;