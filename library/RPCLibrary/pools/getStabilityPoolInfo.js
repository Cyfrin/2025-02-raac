import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';

async function getStabilityPoolInfo(chainId, address, provider) {
  try {
    const stabilityPoolAddress = getContractAddress(chainId, 'stabilitypool');
    const abi = getABI('stabilitypool');
    const stabilityPoolContract = new ethers.Contract(stabilityPoolAddress, abi, provider);

    const handleError = (operation) => (error) => {
      if (error.code === 'BAD_DATA') {
        console.log(`BAD_DATA from getStabilityPoolInfo - ${operation}:`, error.message);
        return 0n;
      }
      throw error;
    };

    // Fetch data from StabilityPool
    const [totalDeposits, totalAllocation, exchangeRate, totalRAACRewards] = await Promise.all([
      stabilityPoolContract.getTotalDeposits().catch(handleError('getTotalDeposits')),
      stabilityPoolContract.getTotalAllocation().catch(handleError('getTotalAllocation')),
      stabilityPoolContract.getExchangeRate().catch(handleError('getExchangeRate')),
      stabilityPoolContract.raacToken().then(async (raacTokenAddress) => {
        const raacTokenAbi = getABI('raactoken'); // Ensure you have the correct ABI
        const raacTokenContract = new ethers.Contract(raacTokenAddress, raacTokenAbi, provider);
        return raacTokenContract.balanceOf(stabilityPoolAddress).catch(handleError('raacToken balanceOf'));
      }).catch(handleError('raacToken')),
    ]);

    let userDeposit = 0n;
    let pendingRewards = 0n;
    if (address) {
      [userDeposit, pendingRewards] = await Promise.all([
        stabilityPoolContract.getUserDeposit(address).catch(handleError('getUserDeposit')),
        stabilityPoolContract.getPendingRewards(address).catch(handleError('getPendingRewards')),
      ]);
    }

    // Fetch RAAC Minter information if needed for APY calculation
    const raacMinterAddress = await stabilityPoolContract.raacMinter().catch(handleError('raacMinter'));
    let apy = '0';

    if (raacMinterAddress && raacMinterAddress !== ethers.ZeroAddress) {
      const raacMinterABI = getABI('raacminter');
      const raacMinterContract = new ethers.Contract(raacMinterAddress, raacMinterABI, provider);

      const [emissionRate, totalSupply] = await Promise.all([
        raacMinterContract.emissionRate().catch(handleError('emissionRate')),
        raacMinterContract.getTotalSupply().catch(handleError('getTotalSupply')),
      ]);

      // APY Calculation
      // Assuming emissionRate is per block and BLOCKS_PER_YEAR is known
      const BLOCKS_PER_YEAR = 2102400n; // Approximate number of blocks per year (Ethereum ~15 sec/block)
      const emissionRatePerYear = emissionRate * BLOCKS_PER_YEAR;
      apy = totalSupply > 0n ? (emissionRatePerYear * 10000n) / totalSupply : 0n;
    }

    const result = {
      totalDeposits: ethers.formatEther(totalDeposits ?? 0n),
      totalAllocation: (totalAllocation ?? 0n).toString(),
      exchangeRate: ethers.formatUnits(exchangeRate ?? 0n, 18),
      totalRAACRewards: ethers.formatEther(totalRAACRewards ?? 0n),
      userDeposit: ethers.formatEther(userDeposit ?? 0n),
      pendingRewards: ethers.formatEther(pendingRewards ?? 0n),
      apy: parseFloat((apy ?? 0n).toString()) / 100, // APY in percentage
    };

    return result;
  } catch (error) {
    console.error('Error fetching stability pool info:', error);
    throw error;
  }
}

export default getStabilityPoolInfo;