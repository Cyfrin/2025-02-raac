// let fs;
// let path;
// let fileURLToPath;

// if (typeof window === 'undefined') {
//   // Server-side
//   fs = await import('fs');
//   path = await import('path');
//   fileURLToPath = await import('url').fileURLToPath;
// }

// import chain8453 from '../configs/chains/8453.json' assert { type: 'json' };


export const getConfig = (chainId) => {
  if (typeof window === 'undefined') {
    // Server-side logic
    console.log('Server-side logic',fs,path,fileURLToPath);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const configPath = path.join(__dirname, '..', 'configs', 'chains', `${chainId}.json`);
    
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } else {
      throw new Error(`Configuration not found for chainId: ${chainId}`);
    }
  } else {
    const configs = {
      8453: chain8453,
    };
    
    if (configs[chainId]) {
      return configs[chainId];
    } else {
      throw new Error(`Configuration not found for chainId: ${chainId}`);
    }
  }
};

export default { getConfig };