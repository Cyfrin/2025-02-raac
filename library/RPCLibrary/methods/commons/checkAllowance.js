import { getContract,getContractAddress } from '../../utils/contracts.js';

const checkAllowance = async (chainId, tokenId, address, spenderAddress, provider) => {
  let tokenAddress = getContractAddress(chainId, tokenId);
  console.log(`[commons/checkAllowance] Checking allowance for ${address} to ${spenderAddress} on ${chainId} ${tokenId}:${tokenAddress}`);

  try {
      const tokenContract = getContract(chainId, tokenId, provider);
      const allowance = await tokenContract.allowance(address, spenderAddress);
      return allowance;
  } catch (error) {
    console.error(`Error calling allowance: ${error}`);
    throw new Error(`[commons/checkAllowance] ${chainId} ${tokenId}:${tokenAddress} ${address} ${spenderAddress} ${error}`)
  }
};

export default checkAllowance;
export { checkAllowance };