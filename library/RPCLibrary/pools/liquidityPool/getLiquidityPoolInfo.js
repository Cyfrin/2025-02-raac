import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';

async function getLiquidityPoolInfo(chainId, address, provider) {
  try {
    const liquidityPoolAddress = getContractAddress(chainId, 'liquiditypool');
    const abi = getABI('liquiditypool');
    const liquidityPoolContract = new ethers.Contract(liquidityPoolAddress, abi, provider);
    
    const handleError = (operation) => (error) => {
      if(error.code === 'BAD_DATA') {
        console.log(`BAD_DATA from getLiquidityPoolInfo - ${operation}:`, error.message);
        return 0n;
      }
      throw error;
    };

    // Get all markets
    const markets = await liquidityPoolContract.getMarkets().catch(handleError('getMarkets'));

    const result = {
      markets: {},
      tvl: '0'
    };

    for (const market of markets) {
      const [totalLiquidity, userLiquidity, exchangeRate] = await Promise.all([
        liquidityPoolContract.getTotalLiquidity(market).catch(handleError('getTotalLiquidity')),
        address ? liquidityPoolContract.getUserLiquidity(pairedToken, address).catch(handleError('getUserLiquidity')) : [0n, 0n, 0n],
        liquidityPoolContract.getExchangeRate(pairedToken).catch(handleError('getExchangeRate'))
      ]);

      result.markets[pairedToken] = {
        totalLiquidity: {
          raac: ethers.formatEther(totalLiquidity[0] ?? 0n),
          paired: ethers.formatEther(totalLiquidity[1] ?? 0n)
        },
        userLiquidity: {
          raac: ethers.formatEther(userLiquidity[0] ?? 0n),
          paired: ethers.formatEther(userLiquidity[1] ?? 0n),
          lpAmount: ethers.formatEther(userLiquidity[2] ?? 0n)
        },
        exchangeRate: {
          raacPerPaired: ethers.formatEther(exchangeRate[0] ?? 0n),
          pairedPerRaac: ethers.formatEther(exchangeRate[1] ?? 0n)
        }
      };
    }

    const tvl = await liquidityPoolContract.getTotalValueLocked().catch(handleError('getTotalValueLocked'));
    result.tvl = ethers.formatEther(tvl ?? 0n);

    console.log('getLiquidityPoolInfo result:', result);
    return result;
  } catch (error) {
    console.error('Error fetching liquidity pool info:', error);
    throw error;
  }
}

export default getLiquidityPoolInfo;