# RAAC Governance System

## Overview

The RAAC governance system is designed to allow token holders to participate in the decision-making process for the protocol.  
It utilizes the veRAAC token, which is obtained by locking RAAC tokens, to grant voting rights and control over various aspects of the system.

## Key Components

### veRAAC Token
- **Purpose**: Represents voting power in the governance system
- **Acquisition**: Users lock RAAC tokens to receive veRAAC
- **Properties**: Non-transferable, time-locked tokens

### Proposal Creation
- Eligible veRAAC holders can create governance proposals
- Proposal types may include:
  - Protocol parameter changes
  - Smart contract upgrades
  - Treasury fund allocations
  - Changes to the dynamic emissions schedule

### Voting Mechanisms
- One veRAAC, one vote system
- Potential implementation of quadratic voting for certain decisions
- Voting period duration to be determined

### Gauge Control System
- Similar to Curve Finance's implementation
- veRAAC holders can vote on gauge weights to direct RAAC token emissions
- Gauges may include:
  - Liquidity pools
  - Lending markets
  - Stability pools

### DAO Voting on Benchmark Products
- The DAO can vote to add or remove products from the benchmark used in the dynamic emissions schedule

## Governance Safeguards
- Time-lock mechanisms for implementing critical decisions
- Quorum requirements for high-impact changes
- Multi-signature wallets for managing critical protocol functions

[TODO: voting thresholds, proposal lifecycle, and execution mechanisms]
