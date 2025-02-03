import { ethers } from 'ethers';
import { getContractAddress } from '../../utils/contracts.js';
import { getABI } from '../../utils/artifacts.js';
async function getLendingPoolInfo(chainId, address, provider) {
  try {
    const lendingPoolAddress = getContractAddress(chainId, 'lendingpool');
    console.log(lendingPoolAddress);
    const abi = getABI('lendingpool');
    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, abi, provider);
    
    const handleError = (operation) => (error) => {
      if (error.code === 'BAD_DATA') {
        console.log(`BAD_DATA from ${operation} - Pool empty?`, error.message);
        return 0n;
      }
      throw error;
    };

    const [reserve, rateData, normalizedIncome, normalizedDebt] = await Promise.all([
      lendingPoolContract.reserve().catch(handleError('reserve')),
      lendingPoolContract.rateData().catch(handleError('rateData')),
      lendingPoolContract.getNormalizedIncome().catch(handleError('getNormalizedIncome')),
      lendingPoolContract.getNormalizedDebt().catch(handleError('getNormalizedDebt'))
    ]);

    // Extract data from reserve
    const totalLiquidity = reserve.totalLiquidity ?? 0n;
    const totalUsage = reserve.totalUsage ?? 0n;
    const liquidityIndex = reserve.liquidityIndex ?? 0n;
    const usageIndex = reserve.usageIndex ?? 0n;

    // Compute utilization
    let utilization = 0n;
    if (totalLiquidity + totalUsage > 0n) {
      utilization = (totalUsage * BigInt(1e27)) / (totalLiquidity + totalUsage);
    }

    // Extract rate data
    const currentLiquidityRate = rateData.currentLiquidityRate ?? 0n;
    const currentUsageRate = rateData.currentUsageRate ?? 0n;
    const primeRate = rateData.primeRate ?? 0n;
    const baseRate = rateData.baseRate ?? 0n;
    const optimalRate = rateData.optimalRate ?? 0n;
    const maxRate = rateData.maxRate ?? 0n;
    const optimalUtilizationRate = rateData.optimalUtilizationRate ?? 0n;
    const protocolFeeRate = rateData.protocolFeeRate ?? 0n;

    // Compute APY
    let apy;
    if (utilization <= optimalUtilizationRate) {
      const rateSlope = primeRate - baseRate;
      const rateIncrease = (utilization * rateSlope) / optimalUtilizationRate;
      apy = baseRate + rateIncrease;
    } else {
      const excessUtilization = utilization - optimalUtilizationRate;
      const maxExcessUtilization = BigInt(1e27) - optimalUtilizationRate;
      const rateSlope = maxRate - primeRate;
      const rateIncrease = (excessUtilization * rateSlope) / maxExcessUtilization;
      apy = primeRate + rateIncrease;
    }

    let userRedeemable = 0n;  
    if (address) {
      // Fetch user's scaled RToken balance
      const rTokenAddress = reserve.reserveRTokenAddress;
      console.log(rTokenAddress);
      const rTokenABI = getABI('rtoken');
      console.log(rTokenABI);
      const rTokenContract = new ethers.Contract(rTokenAddress, rTokenABI, provider);

      const userScaledBalance = await rTokenContract.balanceOf(address).catch(handleError('rToken balanceOf'));

      // Compute user's redeemable balance: userRedeemable = userScaledBalance * liquidityIndex / RAY
      userRedeemable = (userScaledBalance * liquidityIndex) / BigInt(1e27);
    }

    const result = {
      totalLiquidity: ethers.formatEther(totalLiquidity),
      totalBorrow: ethers.formatEther(totalUsage),
      utilization: (Number(utilization.toString()) / 1e27).toFixed(6),  // Utilization as a decimal value between 0 and 1
      liquidityIndex: (Number(liquidityIndex.toString()) / 1e27).toFixed(6),
      usageIndex: (Number(usageIndex.toString()) / 1e27).toFixed(6),
      currentLiquidityRate: ((Number(currentLiquidityRate.toString()) / 1e25).toFixed(2)) + '%',
      currentUsageRate: ((Number(currentUsageRate.toString()) / 1e25).toFixed(2)) + '%',
      primeRate: ((Number(primeRate.toString()) / 1e25).toFixed(2)) + '%',
      baseRate: ((Number(baseRate.toString()) / 1e25).toFixed(2)) + '%',
      optimalRate: ((Number(optimalRate.toString()) / 1e25).toFixed(2)) + '%',
      maxRate: ((Number(maxRate.toString()) / 1e25).toFixed(2)) + '%',
      optimalUtilizationRate: (Number(optimalUtilizationRate.toString()) / 1e27).toFixed(6),
      protocolFeeRate: ((Number(protocolFeeRate.toString()) / 1e25).toFixed(2)) + '%',
      normalizedIncome: (Number(normalizedIncome.toString()) / 1e27).toFixed(6),
      normalizedDebt: (Number(normalizedDebt.toString()) / 1e27).toFixed(6),
      apy: ((Number(apy.toString()) / 1e25).toFixed(2)) + '%',
      userRedeemable: ethers.formatEther(userRedeemable ?? 0n),
    };

    return result;
  } catch (error) {
    console.error('Error fetching lending pool info:', error);
    throw error;
  }
}

export default getLendingPoolInfo;