# RAAC

### Prize Pool

- Total Pool - $77,280
- H/M - $74,000
- Low - $3,280

- Starts: February 03, 2025 Noon UTC
- Ends: February 24, 2025 Noon UTC

- nSLOC: 3864

[//]: # (contest-details-open)

## About the Project

```
RAAC is a protocol designed to bring real estate on-chain and deeply integrate it within on-chain finance rails for seamless accessibility, composability, stability and capital efficiency.

It provides actors with interactions from estate to crv, crv to raac, and raac to defi.
Such connecting the real-estate and unlocking its liquidity via the ability to buy, sell, lend and borrow via pool.
Additional governance and ve-mechanism on dual-gauge systems allow the pilot to pilot the protocol in a specific direction.

```

- [Documentation](https://github.com/Cyfrin/2025-02-raac/tree/main/docs)
- [Website](www.raac.io)
- [Twitter](www.twitter.com/RegnumAurum)
- [GitHub](www.github.com/RegnumAurumAcquisitionCorp)


## Actors

- **NFT Owner**: Has a RAAC NFT that can be used in the lending pool. He may receive tokens for holding this NFT.

- **Lender:** Own crvUSD and deposits it into the lending pool or stability pool. Receives RToken when lending. The lender can deposit RToken in StabilityPool and receive a deToken (debt token).
- **Borrower**: NFT Owner that collateralizes their NFT and borrows CRVUSD against them.
- **Minter**: Upon an increase of the borrow, the debt is represented in a DebtToken.
- **Collector**: Contracts that receive swap taxes and similar revenue (FeeCollector).
- **Proposer**: Owns veRAAC, is able to perform new governance proposal
- **Delegator**: Owns veRAAC, but delegates to another address.
- **Executer**: Contract or user that is able to execute scheduled governance proposals.
- **Oracle**: Changes the house price in the RAACHousePrice and updates the prime rate in LendingPool
- **Manager**: Has specific access to fund in pools (Stability)
- **Minter**: Triggered execution by some Stability Pool interaction, is responsible for minting new RAAC tokens to the Stability Pool for later distribution.
- **Deployer**: Actor that deployed the initial smart contracts and is the *owner* of Ownable smart contracts.
- **Seller**: The seller of RAAC NFT. A physical company or person.

[//]: # (contest-details-close)

[//]: # (scope-open)

## Scope (contracts)


```
contracts
├── core
│   ├── collectors
│   │   ├── FeeCollector.sol
│   │   └── Treasury.sol
│   ├── governance
│   │   ├── boost
│   │   │   └── BoostController.sol
│   │   ├── gauges
│   │   │   ├── BaseGauge.sol
│   │   │   ├── GaugeController.sol
│   │   │   ├── RAACGauge.sol
│   │   │   └── RWAGauge.sol
│   │   └── proposals
│   │       ├── Governance.sol
│   │       └── TimelockController.sol
│   ├── minters
│   │   ├── RAACMinter
│   │   │   └── RAACMinter.sol
│   │   └── RAACReleaseOrchestrator
│   │       └── RAACReleaseOrchestrator.sol
│   ├── oracles
│   │   ├── RAACHousePriceOracle.sol
│   │   └── RAACPrimeRateOracle.sol
│   ├── pools
│   │   ├── LendingPool
│   │   │   └── LendingPool.sol
│   │   └── StabilityPool
│   │       └── StabilityPool.sol
│   ├── primitives
│   │   └── RAACHousePrices.sol
│   └── tokens
│       ├── DEToken.sol
│       ├── DebtToken.sol
│       ├── RAACNFT.sol
│       ├── RAACToken.sol
│       ├── RToken.sol
│       └── veRAACToken.sol
├── libraries
│   ├── math
│   │   ├── TimeWeightedAverage.sol
│   └── pools
│       └── ReserveLibrary.sol
└── zeno
    ├── Auction.sol
    ├── ZENO.sol
```

## Compatibilities

All EVM Compatible, Curve ecosystem ready (cross curve via EYWA).
NFT should be standard compatible (Opensea,...), and later will be using Instruxi Mesh.
Openzepellin inherited.
Chainlink Functions
CurveVault when available (mainnet).
USDC or other ERC20 usable in Zeno, but also within the pools.
Auto-compounders (e.g: Llama Airforce)

[//]: # (scope-close)

[//]: # (getting-started-open)

## Setup

Dependencies: NodeJS

Installing:
```bash
git clone https://github.com/Cyfrin/2025-02-raac.git
cd 2025-02-raac
npm install
```

Will install hardhat, so all hardhat processes shall fit.

Running local node (hardhat):
```
npm run node
```


Deploying:
```
npm run dev
```

This will start a local node, deploy the contract on the node and return deployment information (contract), for RPC use.

This will require a .env with:
- MNEMONIC=any_mnemonic_but_hardhat_one_helps
- NETWORK=local

Using Hardhat’s default mnemonic here will help audits for testing.

Auditors can spawn the development documentation, that will have detailed API, and that is served as .md in the /docs folder, locally on browser via a ‘npm run serve:docs’ or by going to this website: https://github.io/RegnumAurumAcquisitionCorp/core (github.io pages) for its latest master state.

For each contract, the unit test should have provided a replicable self-isolated (usually via mocks) way to “play” with the contract. A RPC is also locally provided to test accessing and processing data, and a Deployer.

Tests:
The tests are divided into unit tests and integration tests. All of the tests can be found in `/test` folder.

In the `package.json`, you can find some scripts for tests.
Any test can be ran through `npm run test:unit:{[all, collectors, governance, tokens, zeno, minters, pools, raac, versace, libraries, oracle]}`.

[//]: # (getting-started-close)

[//]: # (known-issues-open)

## Known Issues

- Deployer is a trusted role (can swap oracles, can set fee whitelist, and other owner function).
A step of delegation of the owner rights to Timelock is planned for production when we ensure proper launch.
- LendingPool: Interest calculations use different methods for deposits (linear) and borrows (compound), this generates dust.

**Additional Known Issues detected by LightChaser can be found [here](https://github.com/Cyfrin/2025-02-raac/issues/1).

[//]: # (known-issues-close)
