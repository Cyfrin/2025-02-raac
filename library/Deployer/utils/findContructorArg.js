import { ethers } from "ethers";

export default function findContructorArg(constructorArgs, deployedContracts) {
    if (!constructorArgs) {
        throw new Error('Constructor arguments not found');
    }

    return constructorArgs.map(arg => {
        if (typeof arg === 'string' && arg.startsWith('{{') && arg.endsWith('}}')) {
            const content = arg.slice(2, -2).trim(); // Remove {{ }}
            const parts = content.split('|');
            const contractRef = parts[0].trim();
            const fallback = parts[1]?.trim();

            switch(contractRef) {
                case 'CHAINLINK_ROUTER':
                    const ROUTERS = {
                        mainnet: '0x65Dcc24F8ff9e51F10DCc7Ed1e4e2A61e6E14bd6',
                        sepolia: '0xb83E47C2bC239B3bf370bc41e1459A34b41238D0',
                    }
                    return ROUTERS[process.env.NETWORK] || null;
                case 'DON_ID':
                    const DONS = {
                        mainnet: ethers.encodeBytes32String('fun-ethereum-mainnet-1'),
                        sepolia: ethers.encodeBytes32String('fun-ethereum-sepolia-1'),
                        local: ethers.encodeBytes32String('fun-ethereum-local-1'),
                    }
                    return DONS[process.env.NETWORK] || null;
                default:
                    if (!deployedContracts[contractRef]) {
                        if (fallback === 'ZERO_ADDRESS') {
                            return '0x0000000000000000000000000000000000000000';
                        }
                        throw new Error(`Contract ${contractRef} not found in deployed contracts`);
                    }
                    return deployedContracts[contractRef];
            }
          
        }
        return arg;
    });
}