export const estimateGasPrice = async (signer) => {
  const provider = signer.provider;
  try {
    const feeData = await provider.getFeeData();
    return {
      maxFeePerGas: feeData.maxFeePerGas,
      // maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    };
  } catch (error) {
    console.log('Error getting gas price', error);
    if(provider?.getGasPrice) {
      const gasPrice = await provider.getGasPrice();
      return { gasPrice };
    }
    return { gasPrice: 0 };
  }
};


export default estimateGasPrice;