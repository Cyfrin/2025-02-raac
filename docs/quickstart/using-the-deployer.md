# Using the Deployer

The Deployer is a addition tool for deploying and managing the Regnum Aurum smart contract infrastructure.  
It provides both UI and CLI interfaces for deployment processes.  
Currently, still very experimental, CLI use will be prefered.

## Installation

```bash
npm install @regnumaurumacquisitioncorp/core
```

## Configuration

1. Create a `.env` file in your project root:
```env
PRIVATE_KEY=your_private_key
INFURA_KEY=your_infura_key
NETWORK=destination_network
ETHERSCAN_API_KEY=your_etherscan_key
```

2. Configure deployment settings in `tge.json`:
```json
{
  "network": "sepolia",
  "contracts": {
    // Contract configurations
  }
}
```

## Deployment Methods

### Using the UI Interface

```bash
node library/Deployer/startWithUI.js
```

The UI interface provides:
- Interactive contract deployment
- Real-time deployment status
- Network selection
- Gas price optimization
- Contract verification

### Using the CLI Interface

```bash
node library/Deployer/startWithoutUI.js
```

For automated deployments or CI/CD pipelines.

### Programmatic Usage

```javascript
import Deployer from '@regnumaurumacquisitioncorp/core/library/Deployer';

const deployer = new Deployer({
  network: process.env.NETWORK,
  privateKey: process.env.PRIVATE_KEY
});

// Deploy specific contracts
await deployer.deploy('RAACToken');
await deployer.deploy('LendingPool');
```

## Post-Deployment

Run post-deployment scripts to initialize contracts:

```bash
node library/Deployer/post_deploy.js
```

## Deployment Processes

The Deployer supports various deployment processes:

1. **Full Deployment**
   - Deploys all core contracts
   - Sets up initial parameters
   - Links contracts together

2. **Partial Deployment**
   - Deploy specific contracts
   - Update existing contracts
   - Add new features

3. **Contract Upgrades**
   - Upgrade proxy contracts
   - Migrate data
   - Verify new implementations

## Network Support

The Deployer supports multiple networks:
- Ethereum Mainnet
- Sepolia Testnet
- Local Development Network

## Events and Logging

The Deployer emits events during deployment:

```javascript
deployer.on('contractDeployed', (contractName, address) => {
  console.log(`${contractName} deployed to: ${address}`);
});

deployer.on('error', (error) => {
  console.error('Deployment error:', error);
});
```

## Troubleshooting

Common issues and solutions:
- Gas price too high: Use the gas price optimization feature
- Contract verification fails: Check network scanner API keys
- Network connection issues: Verify RPC endpoints

## Security Considerations

- Keep private keys secure
- Use different keys for testing and production
- Verify contract source code after deployment
- Review gas settings before deployment
