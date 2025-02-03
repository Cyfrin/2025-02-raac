import { ethers } from 'ethers';
import { getContractAddress as _getContractAddress } from '../contracts/getContractAddress.js';
import configs from '../configs/chains/index.js';

const isBrowser = typeof window !== 'undefined';

export const getProvider = (chainId) => {
  const config = configs[chainId];
  const rpcUrl = config.rpcUrls ? config.rpcUrls[0] : config.rpc;
  return new ethers.JsonRpcProvider(rpcUrl);
};

export const getContractAddress = (chainId, contractName) => {
  return _getContractAddress(chainId, contractName);
};

export const getSigner = async (provider) => {
  if (!isBrowser) {
    throw new Error('getSigner is only available in browser environments');
  }
  if (window.ethereum) {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    return new ethers.BrowserProvider(window.ethereum).getSigner();
  } else {
    throw new Error('No Ethereum browser extension detected');
  }
};

export const getChainId = async () => {
  if (!isBrowser) {
    throw new Error('getChainId is only available in browser environments');
  }
  if (window.ethereum) {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  } else {
    throw new Error('No Ethereum browser extension detected');
  }
};

export const switchChain = async (chainId) => {
  if (!isBrowser) {
    throw new Error('switchChain is only available in browser environments');
  }
  if (window.ethereum) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error) {
      if (error.code === 4902) {
        await addChain(chainId);
      } else {
        throw error;
      }
    }
  } else {
    throw new Error('No Ethereum browser extension detected');
  }
};

const addChain = async (chainId) => {
  if (!isBrowser) {
    throw new Error('addChain is only available in browser environments');
  }
  const chainConfig = configs[chainId];
  if (!chainConfig) {
    throw new Error(`Chain configuration not found for chainId: ${chainId}`);
  }

  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: `0x${chainId.toString(16)}`,
      chainName: chainConfig.name,
      nativeCurrency: chainConfig.nativeCurrency,
      rpcUrls: chainConfig.rpcUrls,
      blockExplorerUrls: chainConfig.blockExplorerUrls,
    }],
  });
};