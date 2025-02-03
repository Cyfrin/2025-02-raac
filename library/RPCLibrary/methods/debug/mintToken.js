import { ethers } from 'ethers';

import { getContractAddress } from '../../contracts/getContractAddress.js';
import estimateGasPrice from '../commons/estimateGasPrice.js';

import crvUSDTokenArtifact from '../../artifacts/Tokens/crvUSDToken.sol/crvUSDToken.json' assert { type: "json" };
import spcrvUSDTokenArtifact from '../../artifacts/Tokens/spcrvUSDToken.sol/spcrvUSDToken.json' assert { type: "json" };
import RAACTokenArtifact from '../../artifacts/Tokens/RAACToken.sol/RAACToken.json' assert { type: "json" };
import veRAACTokenArtifact from '../../artifacts/Tokens/veRAACToken.sol/veRAACToken.json' assert { type: "json" };
import rcrvUSDTokenArtifact from '../../artifacts/Tokens/rCRVUSDToken.sol/rCRVUSDToken.json' assert { type: "json" };
import RAACLendingPoolArtifact from '../../artifacts/LendingPool/RAACLendingPool.sol/RAACLendingPool.json' assert { type: "json" };
import RAACStabilityPoolArtifact from '../../artifacts/StabilityPool/StabilityPool.sol/StabilityPool.json' assert { type: "json" };
import LiquidityPoolArtifact from '../../artifacts/LiquidityPool/LiquidityPool.sol/LiquidityPool.json' assert { type: "json" };
import RTokenArtifact from '../../artifacts/Tokens/RToken.sol/RToken.json' assert { type: "json" };
import RAACNFTArtifact from '../../artifacts/Tokens/RAACNFT.sol/RAACNFT.json' assert { type: "json" };

const CRVUSD_ABI = crvUSDTokenArtifact.abi;
const SPCRVUSD_ABI = spcrvUSDTokenArtifact.abi;
const VERAAC_ABI = veRAACTokenArtifact.abi;
const RCRVUSD_ABI = rcrvUSDTokenArtifact.abi;
const RAACLENDINGPOOL_ABI = RAACLendingPoolArtifact.abi;
const RAACSTABILITYPOOL_ABI = RAACStabilityPoolArtifact.abi;
const LIQUIDITYPOOL_ABI = LiquidityPoolArtifact.abi;
const RAAC_ABI = RAACNFTArtifact.abi;
const RTOKEN_ABI = RTokenArtifact.abi;


const mintToken = async (chainId, assetId, amount, signer) => {
  if (!signer) {
    throw new Error('Wallet not connected');
  }
  const normalizedAssetId = assetId.toLowerCase();
  const contractAddress = getContractAddress(chainId, normalizedAssetId);
  let contract;

  try {
    switch (normalizedAssetId) {
      case 'crvusd':
        contract = new ethers.Contract(contractAddress, CRVUSD_ABI, signer);
        break;
      case 'spcrvusd':
        contract = new ethers.Contract(contractAddress, SPCRVUSD_ABI, signer);
        break;
      case 'rcrvusd':
        contract = new ethers.Contract(contractAddress, RCRVUSD_ABI, signer);
        break;
      case 'rtoken':
        contract = new ethers.Contract(contractAddress, RTOKEN_ABI, signer);
        break;
      case 'raacnft':
        contract = new ethers.Contract(contractAddress, RAACNFT_ABI, signer);
        break;
      case 'veraac':
        contract = new ethers.Contract(contractAddress, VERAAC_ABI, signer);
        break;
      default:
        throw new Error(`Unsupported asset: ${normalizedAssetId}`);
    }

    const { maxFeePerGas } = await estimateGasPrice(signer);
    const tx = await contract.mint(await signer.getAddress(), ethers.parseEther(amount), { 
      maxFeePerGas,
      // maxPriorityFeePerGas
    });
    console.log(`Minting transaction sent for ${normalizedAssetId}:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`Minted ${amount} ${normalizedAssetId} successfully:`, receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error(`Minting error for ${normalizedAssetId}:`, error);
    throw new Error(`Minting failed for ${normalizedAssetId}: ${error.message}`);
  }
};

export default mintToken;