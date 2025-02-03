import chalk from 'chalk';

export const deploymentSteps = [
    {
        message: chalk.cyan('Initializing deployment process...'),
        // message: 'Initializing deployment process...',
        color: 'cyan',
        delay: 500
    },
    {
        message: '2nitializing deployment process...',
        delay: 500
    },
    
    {
        message: chalk.green('✓ Deployment process initialized'),
        delay: 300
    },
    {
        message: chalk.cyan('Checking network connection...'),
        delay: 500
    },
    {
        message: chalk.green('✓ Network connection established to') + ' ' + chalk.yellow('Ethereum Mainnet'),
        delay: 300
    },
    {
        message: chalk.cyan('Loading contract artifacts...'),
        delay: 800
    },
    {
        message: chalk.green('✓ Found 52 contracts to compile'),
        delay: 300
    },
    {
        message: chalk.cyan('Compiling core contracts...'),
        delay: 1000
    },
    {
        message: chalk.gray('- Compiling core/collectors...'),
        delay: 200
    },
    {
        message: chalk.gray('- Compiling core/governance...'),
        delay: 200
    },
    {
        message: chalk.gray('- Compiling core/minters...'),
        delay: 200
    },
    {
        message: chalk.gray('- Compiling core/pools...'),
        delay: 200
    },
    {
        message: chalk.gray('- Compiling core/primitives...'),
        delay: 200
    },
    {
        message: chalk.gray('- Compiling core/tokens...'),
        delay: 200
    },
    {
        message: chalk.cyan('Compiling interfaces...'),
        delay: 800
    },
    {
        message: chalk.cyan('Compiling libraries...'),
        delay: 800
    },
    {
        message: chalk.green('✓ Compilation successful - All contracts compiled'),
        delay: 300
    },
    {
        message: chalk.cyan('Running size checks...'),
        delay: 500
    },
    {
        message: chalk.gray('Core contracts:'),
        delay: 100
    },
    {
        message: chalk.gray('- FeeCollector.sol: 4.2 KB'),
        delay: 100
    },
    {
        message: chalk.gray('- Treasury.sol: 3.8 KB'), 
        delay: 100
    },
    {
        message: chalk.gray('- BoostController.sol: 5.1 KB'),
        delay: 100
    },
    {
        message: chalk.gray('- GaugeController.sol: 8.3 KB'),
        delay: 100
    },
    {
        message: chalk.green('✓ All contracts within size limits'),
        delay: 300
    },
    {
        message: chalk.cyan('Estimating deployment gas costs...'),
        delay: 800
    },
    {
        message: chalk.gray('Total estimated gas: 8,245,678 gwei'),
        delay: 300
    },
    {
        message: chalk.cyan('Deploying core contracts...'),
        delay: 1000
    },
    {
        message: chalk.gray('1/8 Deploying FeeCollector...'),
        delay: 200
    },
    {
        message: chalk.green('✓ FeeCollector deployed at: ') + chalk.yellow('0x742d35Cc6634C0532925a3b844Bc454e4438f44e'),
        delay: 200
    },
    {
        message: chalk.gray('2/8 Deploying Treasury...'),
        delay: 200
    },
    {
        message: chalk.green('✓ Treasury deployed at: ') + chalk.yellow('0x8F942C20D5dDEeBD4dD036c6b753aE51E08A3576'),
        delay: 200
    },
    {
        message: chalk.gray('3/8 Deploying Governance system...'),
        delay: 300
    },
    {
        message: chalk.green('✓ Governance system deployed'),
        delay: 200
    },
    {
        message: chalk.gray('4/8 Deploying Gauge system...'),
        delay: 300
    },
    {
        message: chalk.green('✓ Gauge system deployed'),
        delay: 200
    },
    {
        message: chalk.gray('5/8 Deploying Pools...'),
        delay: 300
    },
    {
        message: chalk.green('✓ Pool system deployed'),
        delay: 200
    },
    {
        message: chalk.gray('6/8 Deploying Token contracts...'),
        delay: 300
    },
    {
        message: chalk.green('✓ Token contracts deployed'),
        delay: 200
    },
    {
        message: chalk.gray('7/8 Deploying Price Oracles...'),
        delay: 300
    },
    {
        message: chalk.green('✓ Price Oracles deployed'),
        delay: 200
    },
    {
        message: chalk.gray('8/8 Deploying Auxiliary systems...'),
        delay: 300
    },
    {
        message: chalk.green('✓ Auxiliary systems deployed'),
        delay: 200
    },
    {
        message: chalk.cyan('Verifying contracts on Etherscan...'),
        delay: 1000
    },
    {
        message: chalk.green('✓ All contracts verified successfully'),
        delay: 500
    },
    {
        message: chalk.cyan('Running post-deployment scripts...'),
        delay: 800
    },
    {
        message: chalk.gray('- Setting up initial parameters'),
        delay: 200
    },
    {
        message: chalk.gray('- Configuring access controls'),
        delay: 200
    },
    {
        message: chalk.gray('- Initializing governance parameters'),
        delay: 200
    },
    {
        message: chalk.green('✓ Post-deployment configuration complete'),
        delay: 300
    },
    {
        message: chalk.cyan('Generating deployment artifacts and documentation...'),
        delay: 800
    },
    {
        message: chalk.green('✓ Deployment artifacts saved'),
        delay: 300
    },
    {
        message: chalk.green.bold('✨✨✨✨✨ Deployment complete! System is ready for interaction. ✨✨✨✨✨'),
        delay: 500
    }
];