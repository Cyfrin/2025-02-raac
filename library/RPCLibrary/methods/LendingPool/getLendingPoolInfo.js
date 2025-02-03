import { ethers } from 'ethers';
import { getProvider, getContractAddress } from '../../utils/chain.js';
import RAACLendingPoolArtifact from '../../artifacts/LendingPool/RAACLendingPool.sol/RAACLendingPool.json' assert { type: "json" };


const getLendingPoolInfo = async (chainId, address, _provider) => {
  try {
    const provider = _provider || getProvider(chainId);
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, RAACLendingPoolArtifact.abi, provider);
    
    const [totalLiquidity, totalBorrow, utilization, index, rateInfo, totalAssets] = await Promise.all([
      lendingPoolContract.getTotalLiquidity(),
      lendingPoolContract.getTotalBorrowed(),
      lendingPoolContract.getUtilization(),
      lendingPoolContract.index(),
      lendingPoolContract.rateInfo(),
      lendingPoolContract.totalAssets()
    ]);

    let userRedeemable = 0n;  
    if (address) {
      userRedeemable = await lendingPoolContract.getRedeemable(address);
    }

    const result = {
      totalLiquidity: ethers.formatEther(totalLiquidity),
      totalBorrow: ethers.formatEther(totalBorrow),
      utilization: ethers.formatEther(utilization),
      index: ethers.formatEther(index),
      userRedeemable: ethers.formatEther(userRedeemable),
      totalAssets: ethers.formatEther(totalAssets),
      rateInfo: {
        optimal: ethers.formatEther(rateInfo.optimal),
        base: ethers.formatEther(rateInfo.base),
        low: ethers.formatEther(rateInfo.low),
        high: ethers.formatEther(rateInfo.high)
      }
    };

    console.log('getLendingPoolInfo result:', result);
    return result;
  } catch (error) {
    console.error('Error fetching lending pool info:', error);
    throw error;
  }
};

export default getLendingPoolInfo;

export { getLendingPoolInfo };