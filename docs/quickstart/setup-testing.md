# RAAC Testing Guide

## Setup

```bash
npm install
```

## Test Structure

```
test/
├── unit/                    
│   ├── core/               
│   │   ├── tokens/         # RAAC, veRAAC, RToken, RAACNFT, LPToken, IndexToken tests
│   │   ├── pools/          # LendingPool tests
│   │   ├── oracles/        # RAACPrimeRate, RAACHousePrice oracle tests
│   │   ├── minters/        # RAACReleaseOrchestrator tests
│   │   ├── governance/     # Governance mechanism tests
│   │   └── collectors/     # Fee collection tests
│   ├── libraries/          # ReserveLibrary and other utility tests
│   ├── StabilityPool/      # Stability mechanism tests
│   └── Zeno/               # Zeno auction system tests
└── mocks/                  
    ├── core/               # Protocol component mocks
    ├── libraries/          # Utility mocks
    └── tests/              # Test-specific mocks
```

## Running Tests

### Common Commands

```bash
# Main test suites
npm run test:all            # Run all tests
npm run test:unit:all       # All unit tests

# Core component tests
npm run test:unit:tokens    # Token system tests (RAAC, veRAAC, etc.)
npm run test:unit:pools     # Pool mechanism tests
npm run test:unit:oracles   # Price oracle tests

# Specific token tests
npm run test:unit:raac      # RAAC token tests
npm run test:unit:veraac    # veRAAC token tests
```

## Key Test Files

- `test/unit/core/tokens/veRAACToken.test.js`: Tests for veRAAC staking mechanics
- `test/unit/core/oracles/RAACPrimeRateOracle.test.js`: Tests for prime rate calculations
- `test/unit/core/oracles/RAACHousePriceOracle.test.js`: Tests for house price feeds
- `test/unit/libraries/pools/ReserveLibrary.test.js`: Tests for reserve calculations

## Debugging Tips

Use Hardhat's console.log in contracts for debugging:
```solidity
import "hardhat/console.sol";
console.log("Value:", someValue);
``` 