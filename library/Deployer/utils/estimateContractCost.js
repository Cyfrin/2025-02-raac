import { ethers } from 'ethers';

async function realEstimateContractCost(contractArtifact, provider, constructorArgs = []) {
    const factory = new ethers.ContractFactory(
        contractArtifact.abi,
        contractArtifact.bytecode,
        provider
    );


    try {
          // Resolve any placeholder arguments with actual deployed addresses
          const resolvedArgs = constructorArgs.map(arg => {
            if (typeof arg === 'string' && arg.startsWith('{{') && arg.endsWith('}}')) {
               return '0x2ed6c0CF0Fdf5806D4C8CE9F89d2f40EA9C2EF59'
            }
            return arg;
        });


        const deployTx = await factory.getDeployTransaction(...resolvedArgs);
        const gasLimit = await provider.estimateGas(deployTx);
        const feeData = await provider.getFeeData();

    return {
        gasLimit,
        feeData,
        // EIP-1559 costs
        maxCost: gasLimit * (feeData.maxFeePerGas ?? feeData.gasPrice),
        minCost: gasLimit * (feeData.maxPriorityFeePerGas ?? feeData.gasPrice),
        // Legacy cost
        legacyCost: gasLimit * feeData.gasPrice,
        };
    } catch (error) {
        console.dir(error, { depth: null });
        console.error(`Error estimating contract cost for ${contractArtifact.contractName}`);
        console.error(`Constructor args: `);
        console.log(constructorArgs);
        const constructor = contractArtifact.abi.find(abi => abi.type === 'constructor');
        console.error(`Constructor: ${JSON.stringify(constructor)}`);
        console.error(error);
        throw error;
    }
}

function calculateConstructorGas(constructorAbi, args) {
    if (!constructorAbi) return 21000n; // Base transaction cost

    let gas = 0n;
    constructorAbi.inputs.forEach((input, index) => {
        const arg = args[index];
        switch (input.type) {
            case 'address':
                gas += 20000n; // Cold account access
                break;
            case 'uint256':
            case 'int256':
                gas += 3n * BigInt(arg?.toString()?.length || 1); // Dynamic cost based on number size
                break;
            case 'string':
                gas += 100n + 4n * BigInt(arg?.length || 0); // Base + per-character cost
                break;
            case 'bool':
                gas += 3n;
                break;
            case 'bytes':
            case 'bytes32':
                gas += 3n * 32n; // Fixed size bytes
                break;
            default:
                gas += 3n * 32n; // Default conservative estimate
        }
    });
    return gas;
}

function calculateContractCost(contractArtifact, constructorArgs = [], feeData) {
    // Base deployment cost
    let baseGas = 21000n; // Transaction base cost
    
    // Calculate bytecode deployment cost
    const bytecode = contractArtifact.bytecode.replace('0x', '');
    const bytecodeLength = BigInt(bytecode.length / 2);
    const createCost = 32000n; // Contract creation cost
    const bytecodeGas = bytecodeLength * 200n; // Gas per byte of contract code
    
    // Get constructor from ABI
    const constructor = contractArtifact.abi.find(item => item.type === 'constructor');
    
    // Calculate constructor args gas
    const constructorGas = calculateConstructorGas(constructor, constructorArgs);
    
    // Storage initialization cost (estimate based on contract size)
    const storageCost = (bytecodeLength / 32n) * 20000n;
    
    // Total gas estimate
    const totalGasEstimate = baseGas + createCost + bytecodeGas + constructorGas + storageCost;
    
    // Calculate costs using EIP-1559 fee structure
    const maxFeePerGas = feeData?.maxFeePerGas ?? ethers.parseUnits('30', 'gwei');
    const maxPriorityFeePerGas = feeData?.maxPriorityFeePerGas ?? ethers.parseUnits('1.5', 'gwei');
    const baseFeePerGas = feeData?.lastBaseFeePerGas ?? maxFeePerGas - maxPriorityFeePerGas;

    return {
        gasEstimate: totalGasEstimate,
        // EIP-1559 costs
        maxCost: totalGasEstimate * maxFeePerGas,
        minCost: totalGasEstimate * (baseFeePerGas + maxPriorityFeePerGas),
        // Detailed breakdown
        breakdown: {
            baseCost: baseGas * maxFeePerGas,
            createCost: createCost * maxFeePerGas,
            bytecodeGas,
            constructorGas,
            storageCost
        },
        // Fee data used
        feeData: {
            maxFeePerGas,
            maxPriorityFeePerGas,
            baseFeePerGas
        }
    };
}

async function estimateContractCost(contractArtifact, provider, constructorArgs = [], feeData, useReal = false) {
    if(useReal) {
        return await realEstimateContractCost(contractArtifact, provider, constructorArgs);
    }
    return calculateContractCost(contractArtifact, constructorArgs, feeData);
}

export { estimateContractCost };
