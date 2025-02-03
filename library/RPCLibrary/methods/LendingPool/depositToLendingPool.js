import { ethers } from 'ethers';
import RAACLendingPoolArtifact from '../../artifacts/LendingPool/RAACLendingPool.sol/RAACLendingPool.json' assert { type: "json" };
import IERC20Artifact from '../../artifacts/interfaces/IERC20.sol/IERC20.json' assert { type: "json" };

async function depositToLendingPool(chainId, lendingPoolAddress, crvUSDAddress, amount, signer) {
  try {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
  
    const contract = new ethers.Contract(lendingPoolAddress, RAACLendingPoolArtifact.abi, signer);

    const lendingPool = new ethers.Contract(lendingPoolAddress, RAACLendingPoolArtifact.abi, signer);
    const crvUSDToken = new ethers.Contract(crvUSDAddress, IERC20Artifact.abi, signer);
    
    // const lendingPool = await ethers.getContractAt('RAACLendingPool', lendingPoolAddress);
    // const crvUSDToken = await ethers.getContractAt('IERC20', crvUSDAddress);

    const tx = await lendingPool.deposit(ethers.parseEther(amount), {
      gasLimit: 500000 
    });

    await tx.wait();
    console.log(`Deposited ${amount} to lending pool successfully`);
    return tx;
  } catch (error) {
    console.error('Deposit error:', error);
    throw new Error(`Deposit to lending pool failed: ${error.message}`);
  }
};

export default depositToLendingPool;