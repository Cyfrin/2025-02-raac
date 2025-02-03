import { ethers } from 'ethers';
import { getContractAddress } from '../../contracts/getContractAddress.js';
import LiquidityPoolArtifact from '../../artifacts/LiquidityPool/LiquidityPool.sol/LiquidityPool.json' assert { type: "json" };

const getLiquidityPoolInfo = async (chainId, pairedToken, userAddress, provider) => {
  try {
    const contractAddress = getContractAddress(chainId, 'liquiditypool');
    const contract = new ethers.Contract(contractAddress, LiquidityPoolArtifact.abi, provider);

    const [totalLiquidity, userLiquidity, exchangeRate, markets, tvl] = await Promise.all([
      contract.getTotalLiquidity(pairedToken),
      contract.getUserLiquidity(pairedToken, userAddress),
      contract.getExchangeRate(pairedToken),
      contract.getMarkets(),
      contract.getTotalValueLocked()
    ]);

    return {
      totalLiquidity: {
        raac: ethers.formatEther(totalLiquidity.raacLiquidity),
        paired: ethers.formatEther(totalLiquidity.pairedLiquidity)
      },
      userLiquidity: {
        raac: ethers.formatEther(userLiquidity.raacLiquidity),
        paired: ethers.formatEther(userLiquidity.pairedLiquidity),
        lpAmount: ethers.formatEther(userLiquidity.lpAmount)
      },
      exchangeRate: {
        raacPerPaired: ethers.formatEther(exchangeRate.raacPerPaired),
        pairedPerRaac: ethers.formatEther(exchangeRate.pairedPerRaac)
      },
      markets,
      tvl: ethers.formatEther(tvl)
    };
  } catch (error) {
    console.error('Error fetching liquidity pool info:', error);
    throw error;
  }
};

export default getLiquidityPoolInfo;