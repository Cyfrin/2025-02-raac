import Deployer from './Deployer.js';
import tgeConfig from './tge.json' with { type: 'json' };
import readline from 'readline/promises';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function confirm(message) {
    const answer = await rl.question(`${message} (y/N): `);
    return answer.toLowerCase() === 'y';
}

async function main() {
    console.log('Starting TGE Deployment Process...');
    console.log('-----------------------------------');

    const deployer = new Deployer();
    
    try {
        // Step 1: Token Deployment
        console.log('\nPreparing token deployment...');
        const tokenConfig = await deployer.prepareTokenDeployment(tgeConfig);
        console.log('\nToken configuration prepared:', JSON.stringify(tokenConfig, null, 2));
        
        if (await confirm('Proceed with token deployment?')) {
            const tokenDeployment = await deployer.executeTokenDeployment(tokenConfig);
            console.log('\nToken deployed:', JSON.stringify(tokenDeployment, null, 2));
        }

        // Step 2: Token Permissions
        console.log('\nPreparing token permissions...');
        const permissionsConfig = await deployer.prepareTokenPermissions(tgeConfig);
        console.log('\nPermissions configuration prepared:', JSON.stringify(permissionsConfig, null, 2));
        
        if (await confirm('Proceed with permissions setup?')) {
            const permissionsResult = await deployer.executeTokenPermissions(permissionsConfig);
            console.log('\nPermissions configured:', JSON.stringify(permissionsResult, null, 2));
        }

        // Step 3: Liquidity Setup
        console.log('\nPreparing liquidity setup...');
        const liquidityConfig = await deployer.prepareLiquiditySetup(tgeConfig);
        console.log('\nLiquidity configuration prepared:', JSON.stringify(liquidityConfig, null, 2));
        
        if (await confirm('Proceed with liquidity setup?')) {
            const liquidityResult = await deployer.executeLiquiditySetup(liquidityConfig);
            console.log('\nLiquidity configured:', JSON.stringify(liquidityResult, null, 2));
        }

        // Step 4: Public Sale Setup
        console.log('\nPreparing public sale...');
        const publicSaleConfig = await deployer.preparePublicSale(tgeConfig);
        console.log('\nPublic sale configuration prepared:', JSON.stringify(publicSaleConfig, null, 2));
        
        if (await confirm('Proceed with public sale setup?')) {
            const publicSaleResult = await deployer.executePublicSale(publicSaleConfig);
            console.log('\nPublic sale configured:', JSON.stringify(publicSaleResult, null, 2));
        }

        // Final Results
        console.log('\nDeployed Contracts:');
        console.log(JSON.stringify(deployer.getDeployedContracts(), null, 2));
        
        console.log('\nDeployment Logs:');
        console.log(JSON.stringify(deployer.logger.export(), null, 2));
        
        console.log('\nDeployment Stats:');
        console.log(deployer.getStats());

    } catch (error) {
        console.error('Error during deployment:', error);
        console.log('\nDeployment Logs:');
        console.log(JSON.stringify(deployer.logger.export(), null, 2));
        process.exit(1);
    }

    rl.close();
}

main().catch(console.error);