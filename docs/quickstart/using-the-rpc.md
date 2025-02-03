# Using the RPC Library

The RPC Library provides an interface for interacting with the Regnum Aurum smart contracts.  
It handles wallet connections, contract interactions, and various protocol operations.  
It is built upon ethers to aim for cross-chain, single tool goal.  

## Installation

```javascript
import RPCLibrary from '@regnumaurumacquisitioncorp/core/library/RPCLibrary';
```

## Initialization

```javascript
// For browser environments with MetaMask
const rpc = new RPCLibrary();

// For non-browser environments with private key
const rpc = new RPCLibrary(privateKey);
```

## Connecting to a Wallet

```javascript
await rpc.connectWallet();
```

## Core Features

### Asset Management
```javascript
// Get asset information
const asset = await rpc.assets.getAsset(assetAddress);
const supply = await rpc.assets.getSupply(assetAddress);
const allAssets = await rpc.assets.getAssets();

// Wallet operations
await rpc.wallet.assets.approveAsset(assetAddress, spenderAddress, amount);
await rpc.wallet.assets.transferAsset(assetAddress, recipientAddress, amount);
const balance = await rpc.wallet.assets.getBalance(assetAddress);
```

### Pool Operations

#### Lending Pool
```javascript
// Get pool information
const poolInfo = await rpc.pools.lendingPool.getLendingPoolInfo();

// Lending operations
await rpc.pools.lendingPool.depositNFTToLendingPool(nftAddress, tokenId);
await rpc.pools.lendingPool.borrowFromLendingPool(amount);
await rpc.pools.lendingPool.repayToLendingPool(amount);
```

#### Stability Pool
```javascript
// Get pool information
const stabilityInfo = await rpc.pools.stabilityPool.getStabilityPoolInfo();

// Pool operations
await rpc.pools.stabilityPool.depositToStabilityPool(amount);
await rpc.pools.stabilityPool.withdrawFromStabilityPool(amount);
const rewards = await rpc.pools.stabilityPool.calculateRAACRewards();
```

### NFT Operations
```javascript
// NFT management
await rpc.nfts.mint(recipient, tokenURI);
const price = await rpc.nfts.getHousePrice(tokenId);
const ownedNFTs = await rpc.nfts.getOwnedNFTs(address);
const vaultedNFTs = await rpc.nfts.getVaultedNFTs(address);
```

### Price Oracle
```javascript
// House price operations
await rpc.contracts.housePrices.setHousePrice(tokenId, price);
const latestPrice = await rpc.contracts.housePrices.getLatestPrice(tokenId);
```

### Zeno Auctions
```javascript
// Auction operations
await rpc.zeno.createAuction(params);
const auctions = await rpc.zeno.getAuctions();
```

## Error Handling

The library includes built-in error handling for common scenarios:

```javascript
try {
    await rpc.connectWallet();
} catch (error) {
    console.error('Wallet connection failed:', error.message);
}
```

## Browser vs Node.js Environment

The library automatically detects the environment and uses the appropriate provider:
- In browsers, it uses MetaMask or other injected Web3 providers
- In Node.js, it uses the provided private key with a JSON-RPC provider

## Chain Configuration

```javascript
const chainConfig = rpc.getChainsConfig();
await rpc.setChainConfig(chainId, config);
```
