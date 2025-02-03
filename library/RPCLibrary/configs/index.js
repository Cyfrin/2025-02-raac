// let fs;
// let path;
// let fileURLToPath;

// if (typeof window === 'undefined') {
//   // Server-side
// //   fs = import('fs');
//   path = import('path');
//   fileURLToPath = import('url').fileURLToPath;
// }

import chains from './chains/index.js';

function getChainsConfig() {
//   if (typeof window === 'undefined') {
//     // Server-side logic
//     const __filename = fileURLToPath(import.meta.url);
//     const __dirname = path.dirname(__filename);
//     const chainsDir = `${__dirname}/chains`;
//     const chainsFiles = fs.readdirSync(chainsDir).filter(file => file.endsWith('.json'));
    
//     const chains = {};
//     for(const chainFileName of chainsFiles) {
//       const chainId = chainFileName.split('.')[0];
//       const chainConfig = fs.readFileSync(`${chainsDir}/${chainFileName}`, 'utf8');
//       chains[chainId] = JSON.parse(chainConfig);
//     }
//     return chains;
//   } else {
//     const chainConfigs = {
//         8453: chain8453,
//     };
//     // Client-side logic via API ?
//     return chainConfigs;
//   }

    return chains;
}

function setChainConfig(chainId, config) {
    chains[chainId] = config;
}

function getChainConfig(chainId) {
  const chains = getChainsConfig();
  return chains[chainId];
}

export default { getChainsConfig, getChainConfig, setChainConfig };
export { getChainsConfig, getChainConfig, setChainConfig };