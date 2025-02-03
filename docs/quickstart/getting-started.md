# Getting Started

## Overview

This guide will help you set up and run the RAAC Protocol development environment. The protocol uses Hardhat for development and testing, with comprehensive documentation available both locally and online.

## Setup Requirements

### Dependencies

- NodeJS (Latest)
- Git

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/RegnumAurumAcquisitionCorp/core
cd core
npm install
```

This will install all necessary dependencies, including:
- Hardhat development environment
- Testing frameworks
- Documentation tools
- Development dependencies

## Running the Environment

Start the local development environment:

In a first terminal:

```bash
npm run node
```

This will run a local node (8453). And provides you with private-key accessible funds.
Using `Mnemonic: test test test test test test test test test test test junk` as value of the .env will allow direct usability of account #0 (it's the hardhat mnemonic, used for generating the pk seen in `npm run node`).

```bash
npm run dev
```

This command will:
2. Deploy all contracts to the node
3. Return deployment information (contract addresses)
4. Provide RPC endpoint for interaction

This process tries to mimic a lot of the intended production process.  

## Documentation

### Local Development Documentation

To serve the documentation locally:

```bash
npm run serve:docs
```

This will start a local server with the complete API documentation.

### Online Documentation

Latest documentation is always available at:
https://github.io/RegnumAurumAcquisitionCorp/core

The online documentation reflects the current **master** branch state.

## Testing

### Test Structure

Tests are organized in two categories:
1. Unit Tests: Individual contract testing
2. Integration Tests: Cross-contract interaction testing

All tests are located in the `/test` folder.

### Running Tests

Available test commands:

```bash
# Run all unit tests
npm run test:unit:all

# Run specific component tests
npm run test:unit:collectors
npm run test:unit:governance
npm run test:unit:tokens
npm run test:unit:zeno
npm run test:unit:minters
npm run test:unit:pools
npm run test:unit:raac
npm run test:unit:versace
npm run test:unit:libraries
npm run test:unit:oracle
```

### Test Environment

Each contract's unit tests aim to provide:

- Self-isolated testing environment
- Mock implementations where needed, ideally not then a integration test ensure it is always testing with real contracts
- Local RPC access for data verification

## Development Tools

1. Local Node:
   - Hardhat network for development
   - Automated contract deployment
   - RPC endpoint for testing

2. Contract Interaction:
   - Local RPC endpoint
   - Deployment scripts
   - Contract verification tools

3. Documentation:
   - Markdown-based documentation
   - API references
   - Implementation details
