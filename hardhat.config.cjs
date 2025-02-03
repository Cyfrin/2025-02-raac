require('dotenv').config();
require('hardhat-contract-sizer');
require('hardhat-gas-reporter');
require('@nomicfoundation/hardhat-toolbox');
require('@openzeppelin/hardhat-upgrades');

const deploymentNetworks = {};

if (process.env.BASE_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY) {
  deploymentNetworks.base = {
    url: process.env.BASE_RPC_URL,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY]
  };
}

if (process.env.BASE_SEPOLIA_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY) {
  deploymentNetworks.baseSepolia = {
    url: process.env.BASE_SEPOLIA_RPC_URL,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY]
  };
}

if (process.env.SEPOLIA_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY) {
  deploymentNetworks.sepolia = {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY]
  };
}

const config = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true
        }
      },
      viaIR: false
    }
  },

  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 0
      },
      forking: {
        url: process.env.BASE_RPC_URL,
      },
      chainId: 8453,
      gasPrice: 50000000000, // 50 gwei
      allowBlocksWithSameTimestamp: true
    },
    devnet: {
      url: "http://0.0.0.0:8545",
      chainId: 8453,
    },

    ...deploymentNetworks
  },

  etherscan: {
    enabled: true,
    apiKey: {
      base: process.env.BASESCAN_API_KEY,
      baseSepolia: process.env.BASESCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY
    },
    customChains: [
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org/'
        }
      }
    ]
  },

  sourcify: {
    enabled: true
  },

  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
    '@openzeppelin': './node_modules/@openzeppelin'
  },

  gasReporter: {
    enabled: process.env.COINMARKETCAP_KEY !== undefined,
    token: 'ETH',
    currency: 'EUR',
    coinmarketcap: process.env.COINMARKETCAP_KEY
  }
};

module.exports = config;