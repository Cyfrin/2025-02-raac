import { ethers } from 'ethers';
import { getContractAddress } from '../utils/contracts.js';
import { getABI } from '../utils/artifacts.js';
import estimateGasPrice from '../methods/commons/estimateGasPrice.js';

async function get(chainId, signer) {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

  try {
    const raacMinterAddress = getContractAddress(chainId, 'raacminter');
    const raacMinterABI = getABI('raacminter');
    // console.log(raacMinterAddress);
    // console.log(raacMinterABI);

    const raacMinterContract = new ethers.Contract(raacMinterAddress, raacMinterABI, signer);

    const { maxFeePerGas } = await estimateGasPrice(signer);

    const result = {}

    // Call all readable values from the RAACMinter contract
    result.emissionRate = await raacMinterContract.emissionRate();
    result.benchmarkRate = await raacMinterContract.benchmarkRate();
    result.minEmissionRate = await raacMinterContract.minEmissionRate();
    result.maxEmissionRate = await raacMinterContract.maxEmissionRate();
    result.utilizationTarget = await raacMinterContract.utilizationTarget();
    result.excessTokens = await raacMinterContract.excessTokens();
    result.lastUpdateBlock = await raacMinterContract.lastUpdateBlock();
    result.raacToken = await raacMinterContract.raacToken();
    result.stabilityPool = await raacMinterContract.stabilityPool();
    result.lendingPool = await raacMinterContract.lendingPool();
    result.owner = await raacMinterContract.owner();
    result.BLOCKS_PER_DAY = await raacMinterContract.BLOCKS_PER_DAY();


    // APY: 
    const blocksPerYear = result.BLOCKS_PER_DAY * 365n;
    const emissionRatePerYear = result.emissionRate * blocksPerYear;
    console.log("emissionRatePerYear", emissionRatePerYear);
    const totalSupply = await raacMinterContract.getTotalSupply();
    console.log("totalSupply", totalSupply);

    const apy = emissionRatePerYear * 10000n / totalSupply;
    console.log("apy", apy);





    // const BLOCKS_PER_YEAR = 2628000; // Assuming 6500 blocks per day * 365 days
    // const emissionRatePerYear = result.emissionRate * BLOCKS_PER_YEAR;
    // console.log("emissionRatePerYear", emissionRatePerYear);
    // const totalSupply = await raacMinterContract.raacToken().totalSupply();
    
    // if (totalSupply.gt(0)) {
    //     const apy = emissionRatePerYear * 10000 / totalSupply;
    //     result.apy = apy / 100; // Convert to percentage
    // } else {
    //     result.apy = 0;
    // }
    // Constants
    // result.PRECISION = await raacMinterContract.PRECISION();
    // result.BLOCKS_PER_YEAR = await raacMinterContract.BLOCKS_PER_YEAR();
    // result.INITIAL_EMISSION_RATE = await raacMinterContract.INITIAL_EMISSION_RATE();

    // const params = await raacMinterContract.getParameters();
    // result.parameters = {
        // minEmissionRate: params[0],
        // maxEmissionRate: params[1],
        // utilizationTarget: params[2],
        // adjustmentSpeed: params[3],
        // benchmarkRate: params[4],
        // emissionRate: params[5],
        // excessTokens: params[6]
    // };
   
    // const tick = await raacMinterContract.tick();
    // address, {
    //   maxFeePerGas,
    //   nonce: await signer.getNonce()
    // });

    // console.log(tick);
    return result;
  } catch (error) {
    throw new Error(`Error calculating RAAC rewards: ${error.message}`);
  }
}

export default get;