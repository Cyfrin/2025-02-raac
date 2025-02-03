import { getChainsConfig, getChainConfig } from '../configs/index.js';
import { getABI } from './artifacts.js';
import { ethers } from 'ethers';

let _config;
let _configs;

export const getConfigs = () => {
  if (!_configs) {
    _configs = getChainsConfig();
  }
  return _configs;
};

export const setOverrideConfig = (chainId, newConfig) => {
  if (!_configs) {
    _configs = getConfigs();
  }
  if (!configs[chainId]) {
    configs[chainId] = {};
  }
  configs[chainId] = {
    ...configs[chainId],
    ...newConfig,
    contracts: {
      ...configs[chainId].contracts,
      ...newConfig.contracts
    }
  };
};

export const getConfig = (chainId) => {
  const configs = getConfigs();
  if (!configs[chainId]) {
    throw new Error(`Unsupported chain ID: ${chainId}. Has ${JSON.stringify(Object.keys(configs))}`);
  }
  return configs[chainId];
};

export const getContract = (chainId, contractName, provider) => {
  const normalizedContractName = contractName.toLowerCase();
  const address = getContractAddress(chainId, normalizedContractName);
  const abi = getABI(normalizedContractName);
  return new ethers.Contract(address, abi, provider);
};

export const getContractAddress = (chainId, contractName) => {
  const normalizedContractName = contractName.toLowerCase();
  const config = getConfig(chainId);
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  const keys = Object.keys(config).filter(key => ['contracts', 'assets', 'pools', 'nfts'].includes(key));
  let address = null;
  for (const key of keys) {
    if (config[key] && config[key][normalizedContractName]) {
      address = config[key][normalizedContractName]?.contract;
      break;
    }
  }
  if (!address) {
    const hasIds = keys.map(key => `${key}: ${Object.keys(config[key]).join(', ')}`).join('\n');
    throw new Error(`Contract ${normalizedContractName} not found for chain ID: ${chainId}.\nHas:\n${hasIds}`);
  }
  return address;
};

export default {
  getContract,
  getContractAddress,
  setOverrideConfig,
  getConfig,
  getConfigs,
};