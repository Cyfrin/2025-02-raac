# Governance

## Overview

The Governance contract implements governance functionality for the RAAC protocol. It enables veRAAC token holders to create, vote on, and execute proposals through a secure timelock mechanism.

## Purpose

- Enable veRAAC holders to create and vote on proposals
- Manage protocol parameters through governance
- Implement secure timelock execution for proposals
- Track proposal states and voting results

## Key Functions

| Function Name | Description | Access | Parameters | Returns |
|---------------|-------------|---------|------------|---------|
| propose | Creates a new governance proposal | External | `targets`: Target addresses<br>`values`: ETH values<br>`calldatas`: Function calls<br>`description`: Proposal description<br>`proposalType`: Type of proposal | uint256: Proposal ID |
| castVote | Casts a vote on a proposal | External | `proposalId`: ID of proposal<br>`support`: True for yes, false for no | uint256: Voting weight used |
| execute | Executes a successful proposal | External | `proposalId`: ID of proposal to execute | None |
| cancel | Cancels an active proposal | External | `proposalId`: ID of proposal to cancel | None |
| state | Gets current state of proposal | Public View | `proposalId`: ID of proposal | ProposalState: Current state |

## Implementation Details

### Features:

- Two-step proposal execution with timelock
- Time-weighted voting power from veToken
- Configurable voting delay and period
- Adjustable proposal threshold and multiple proposal types
- Quorum requirements for validity
- Emergency cancellation capabilities
- Vote tracking

## Data Structures

### ProposalCore
| Field | Type | Description |
|-------|------|-------------|
| id | uint256 | Unique proposal identifier |
| proposer | address | Address that created proposal |
| proposalType | ProposalType | Type of governance proposal |
| startTime | uint256 | Start time of voting period |
| endTime | uint256 | End time of voting period |
| executed | bool | Whether proposal was executed |
| canceled | bool | Whether proposal was canceled |
| descriptionHash | bytes32 | Hash of proposal description |
| targets | address[] | Target contract addresses |
| values | uint256[] | ETH values for calls |
| calldatas | bytes[] | Encoded function calls |

### ProposalVote
| Field | Type | Description |
|-------|------|-------------|
| forVotes | uint256 | Total votes in favor |
| againstVotes | uint256 | Total votes against |
| hasVoted | mapping(address => bool) | Tracks who has voted |

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| MIN_VOTING_DELAY | 1 hours | Minimum delay before voting |
| MAX_VOTING_DELAY | 2 weeks | Maximum delay before voting |
| MIN_VOTING_PERIOD | 1 days | Minimum voting duration |
| MAX_VOTING_PERIOD | 4 weeks | Maximum voting duration |
| MIN_PROPOSAL_THRESHOLD | 1000e18 | Minimum tokens to propose |
| MAX_PROPOSAL_THRESHOLD | 1000000e18 | Maximum proposal threshold |
| MIN_QUORUM_NUMERATOR | 2 | Minimum quorum percentage |
| MAX_QUORUM_NUMERATOR | 20 | Maximum quorum percentage |
| QUORUM_DENOMINATOR | 100 | Denominator for quorum calc |

## Events

| Event Name | Description | Parameters |
|------------|-------------|------------|
| ProposalCreated | When proposal is created | `proposalId`: ID<br>`proposer`: Creator<br>`targets`: Addresses<br>`values`: ETH amounts<br>`calldatas`: Function calls<br>`description`: Description<br>`proposalType`: Type<br>`startTime`: Vote start<br>`endTime`: Vote end<br>`proposerVotes`: Creator's votes |
| VoteCast | When vote is cast | `voter`: Voter address<br>`proposalId`: ID<br>`support`: Yes/No<br>`weight`: Vote weight<br>`reason`: Vote reason |
| ProposalCanceled | When proposal canceled | `proposalId`: ID<br>`caller`: Canceler<br>`reason`: Cancel reason |
| ProposalExecuted | When proposal executed | `proposalId`: ID<br>`caller`: Executor<br>`timestamp`: Execution time |
| VotingDelaySet | When delay updated | `oldVotingDelay`: Previous<br>`newVotingDelay`: Updated<br>`caller`: Admin |
| VotingPeriodSet | When period updated | `oldVotingPeriod`: Previous<br>`newVotingPeriod`: Updated<br>`caller`: Admin |
| ProposalThresholdSet | When threshold updated | `oldProposalThreshold`: Previous<br>`newProposalThreshold`: Updated<br>`caller`: Admin |
| QuorumNumeratorSet | When quorum updated | `oldQuorumNumerator`: Previous<br>`newQuorumNumerator`: Updated<br>`caller`: Admin |
| TimelockSet | When timelock updated | `oldTimelock`: Previous<br>`newTimelock`: Updated<br>`caller`: Admin |

## Error Conditions

| Error Name | Description |
|------------|-------------|
| InvalidTimelockAddress | When timelock address invalid |
| InsufficientProposerVotes | When proposer lacks required votes |
| InvalidProposalLength | When proposal arrays mismatched |
| ProposalDoesNotExist | When proposal ID invalid |
| VotingNotStarted | When voting period not begun |
| VotingEnded | When voting period over |
| AlreadyVoted | When voter already voted |
| NoVotingPower | When voter has no power |
| ProposalAlreadyExecuted | When already executed |
| InvalidProposalState | When state incorrect |
| ProposalNotQueued | When not ready for execution |
| InvalidVotingDelay | When delay outside bounds |
| InvalidVotingPeriod | When period outside bounds |
| InvalidProposalThreshold | When threshold outside bounds |
| InvalidQuorumNumerator | When quorum outside bounds |

## Usage Notes

- Proposals require minimum token threshold
- Voting power from veToken balance
- Two-step execution with timelock delay
- Quorum required for validity
- One vote per address per proposal
- Admin can update parameters
- Emergency cancellation possible
- All values use 18 decimal precision
- Timelock adds security delay

## Dependencies

The contract depends on:

- OpenZeppelin's Ownable for access control
- OpenZeppelin's ReentrancyGuard for security
- OpenZeppelin's SafeCast for overflow protection
- TimelockController for delayed execution
- IveRAACToken for voting power tracking