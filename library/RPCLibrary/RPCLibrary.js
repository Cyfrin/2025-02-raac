import { ethers } from 'ethers';
// import { getContractAddress,getConfig } from './utils/contracts.js';
// Commons
import checkAllowance from './methods/commons/checkAllowance.js';
import estimateGasPrice from './methods/commons/estimateGasPrice.js';

import {getChainsConfig, getChainConfig, setChainConfig} from './configs/index.js';

// Assets
import getAsset from './assets/getAsset.js';
import getSupply from './assets/getSupply.js';
import getAssets from './assets/getAssets.js';
// Pools
// Pools#StabilityPool
import getStabilityPoolInfo from './pools/getStabilityPoolInfo.js';
import depositToStabilityPool from './pools/depositToStabilityPool.js';
import withdrawFromStabilityPool from './pools/withdrawFromStabilityPool.js';
import calculateRAACRewards from './pools/calculateRAACRewards.js';
import getStabilityPoolTotalDeposits from './pools/getStabilityPoolTotalDeposits.js';

// Pools#LendingPool
import getLendingPoolInfo from './pools/lendingPool/getLendingPoolInfo.js';
import depositToLendingPool from './pools/lendingPool/depositToLendingPool.js';
import withdrawFromLendingPool from './pools/lendingPool/withdrawFromLendingPool.js';
import getLendingPoolTotalLiquidity from './pools/lendingPool/getLendingPoolTotalLiquidity.js';
import borrowFromLendingPool from './pools/lendingPool/borrowFromLendingPool.js';
import stakeToLendingPool from './pools/lendingPool/stakeToLendingPool.js';
import repayToLendingPool from './pools/lendingPool/repayToLendingPool.js';
import getLoanData from './pools/lendingPool/getLoanData.js';

// Pools#LiquidityPool
import getLiquidityPoolInfo from './pools/liquidityPool/getLiquidityPoolInfo.js';


import depositNFTToLendingPool from './pools/lendingPool/depositNFTToLendingPool.js';
import withdrawNFTFromLendingPool from './pools/lendingPool/withdrawNFTFromLendingPool.js';

import getHousePrice from './pools/lendingPool/getHousePrice.js';

// NFTs
import mintNFT from './nfts/mint.js';
import getNFTHousePrice from './nfts/getHousePrice.js';
import addNewNFTBatch from './nfts/addNewBatch.js';
import setNFTBaseUri from './nfts/setBaseUri.js';
import getNFTCurrentBatchSize from './nfts/getCurrentBatchSize.js';
import getOwnedNFTs from './nfts/getOwnedNFTs.js';
import getVaultedNFTs from './nfts/getVaultedNFTs.js';
import getVaultAddress from './nfts/getVaultAddress.js';
// Contracts
import getContractAddress from './contracts/getContractAddress.js';
import getContract from './contracts/getContract.js';
// House Prices
import setHousePrice from './contracts/housePrices/setHousePrice.js';

// DEPRECATED: we do not have this method anymore in the smart contract
// import updatePriceFromOracle from './contracts/housePrices/updatePriceFromOracle.js';
import getLatestPrice from './contracts/housePrices/getLatestPrice.js';
import setOracle from './contracts/housePrices/setOracle.js';

// Minter
import tick from './minter/tick.js';
import get from './minter/get.js';
import getApy from './minter/getApy.js';

// Wallet
// Wallet#Assets
import mintAsset from './wallet/assets/mintAsset.js';
import burnAsset from './wallet/assets/burnAsset.js';
import approveAsset from './wallet/assets/approveAsset.js';
import getWalletAssets from './wallet/assets/getAssets.js';
import getWalletAsset from './wallet/assets/getAsset.js';
import getWalletAllowance from './wallet/assets/getAllowance.js';
import getWalletBalance from './wallet/assets/getBalance.js';
import transferAsset from './wallet/assets/transferAsset.js';

// Zeno auctions
import getAuctions from './contracts/zeno/getAuctions.js';
import createAuction from './contracts/zeno/createAuction.js';
import createZeno from './contracts/zeno/createZeno.js';
import getZenos from './contracts/zeno/getZenos.js';

class RPCLibrary {
  constructor(privateKey) {
    this.signer = null;
    this.isConnected = false;
    this.address = null;
    this.chainId = null;

    this.privateKey = privateKey;

    this.assets={
      getAsset,
      getAssets,
      getSupply,
    }
    this.wallet = {
      assets: {
        getBalance: getWalletBalance,
        getAllowance: getWalletAllowance,
        getAsset: getWalletAsset,
        getAssets: getWalletAssets,
        transferAsset,
        approveAsset,
        mintAsset,
        burnAsset,
      }
    };

    this.nfts = {
      mint: mintNFT,
      getHousePrice: getNFTHousePrice,
      getOwnedNFTs,
      getVaultedNFTs,
      getVaultAddress,
      addNewBatch: addNewNFTBatch,
      setBaseUri: setNFTBaseUri,
      getCurrentBatchSize: getNFTCurrentBatchSize,
    }
    this.contracts = {
      housePrices: {
        setHousePrice,
        // DEPRECATED
        // updatePriceFromOracle,
        getLatestPrice,
        setOracle,
      },
      minter: {
        tick,
        get,
        getApy,
      },
      getContractAddress,
      getContract
    }

    this.pools = {
      // LiquidityPool
      liquidityPool: {
        getLiquidityPoolInfo,
      },
      stabilityPool: {
        getStabilityPoolInfo,
        depositToStabilityPool,
        withdrawFromStabilityPool,
        calculateRAACRewards,
      },
      // LendingPool
      lendingPool: {
        repayToLendingPool,
        borrowFromLendingPool,
        getHousePrice,
        depositNFTToLendingPool,
        withdrawNFTFromLendingPool,
        getLendingPoolInfo,
      },
      depositToLendingPool,
      withdrawFromLendingPool,
      getLendingPoolTotalLiquidity,
      calculateRAACRewards,
      repayToLendingPool,
      borrowFromLendingPool,
      stakeToLendingPool,
      getLoanData,
      getHousePrice,
      // StabilityPool
      getStabilityPoolTotalDeposits,
      getStabilityPoolInfo,
      depositToStabilityPool,
      withdrawFromStabilityPool,
    }
    this.zeno = {
      createAuction,
      getAuctions,
      createZeno,
      getZenos
    }
  }
  
  async getWallet(privateKey, provider) {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Browser environment with MetaMask
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      return signer;
    } else {
      const wallet = new ethers.Wallet(privateKey, provider);
      return wallet;
    }
  }

  async getProvider(chainId) {
    if (typeof globalThis !== 'undefined' && globalThis.window && typeof globalThis.window.ethereum !== 'undefined') {
      const provider = new ethers.BrowserProvider(globalThis.window.ethereum);
      return provider;
    }

    const config = getChainConfig(chainId);
    const rpcs = config.rpcs;
    const provider = new ethers.JsonRpcProvider(rpcs[0]);
    return provider;
  }

  async getSigner(chainId, address) {
    const provider = await this.getProvider(chainId);
    const signer = await provider.getSigner(address);
    return signer;
  }

  async connectWallet() {
    if (typeof globalThis !== 'undefined' && globalThis.window && typeof globalThis.window.ethereum !== 'undefined') {
      try {
        await globalThis.window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(globalThis.window.ethereum);
        const network = await provider.getNetwork();
        this.chainId = network.chainId;
        this.signer = await provider.getSigner();
        this.address = await this.signer.getAddress();
        this.isConnected = true;
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        throw new Error(`Failed to connect wallet: ${error.message}`);
      }
    } else if (this.provider) {
      // For non-browser environments, use the provider passed to the constructor
      try {
        const network = await this.provider.getNetwork();
        this.chainId = network.chainId;
        this.signer = new ethers.Wallet(this.privateKey, this.provider);
        this.address = await this.signer.getAddress();
        this.isConnected = true;
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        throw new Error(`Failed to connect wallet: ${error.message}`);
      }
    } else {
      throw new Error('No provider available');
    }
  }

  async checkConnection() {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      this.chainId = network.chainId;
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        this.signer = await provider.getSigner();
        this.isConnected = true;
        this.address = accounts[0];
      }
    }
  }

  // Mine a block
  async mineBlock(wallet) {
    const provider = new ethers.BrowserProvider(wallet);
    await provider.send("evm_mine", []);
    // await provider.send('evm_mine', []);
  }
}

RPCLibrary.prototype.checkAllowance = checkAllowance;
RPCLibrary.prototype.estimateGasPrice = estimateGasPrice;
RPCLibrary.prototype.getChainsConfig = getChainsConfig;
RPCLibrary.prototype.setChainConfig = setChainConfig;

export default RPCLibrary;