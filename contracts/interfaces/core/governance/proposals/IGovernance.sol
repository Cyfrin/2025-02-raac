// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IGovernance
 * @author RAAC Protocol Team
 * @notice Interface for the core governance contract that manages protocol proposals and voting
 * @dev Implements comprehensive proposal lifecycle and voting mechanics
 * Key features:
 * - Proposal creation and management
 * - Voting system with quorum requirements
 * - Multiple proposal types for different governance actions
 * - Two-step execution process with timelock
 * - Comprehensive proposal state tracking
 */
interface IGovernance {
    /**
     * @notice Types of governance proposals
     * @dev Different proposal types have different validation and execution paths
     */
    enum ProposalType { 
        ParameterChange,      // For modifying protocol parameters
        SmartContractUpgrade, // For upgrading protocol contracts
        TreasuryAction,       // For treasury management
        EmissionChange,       // For adjusting emission rates
        GaugeManagement      // For gauge-related operations
    }

    /**
     * @notice States that a proposal can be in
     * @dev Represents the lifecycle stages of a proposal
     */
    enum ProposalState {
        Pending,    // Created but not yet active
        Active,     // In voting period
        Canceled,   // Canceled by proposer
        Defeated,   // Failed to meet quorum or majority
        Succeeded,  // Passed vote but not queued
        Queued,     // Scheduled in timelock
        Executed    // Successfully executed
    }

    /**
     * @notice Parameter types that can be set in governance
     * @dev Different parameters that can be modified by the owner
     */
    enum GovernanceParameter {
        VotingDelay,      // Delay before voting starts
        VotingPeriod,     // Duration of voting period
        ProposalThreshold, // Minimum voting power to create proposals
        QuorumNumerator   // Percentage required for quorum
    }

    /**
     * @notice Stores vote counts and voter tracking for a proposal
     * @dev Tracks total votes and individual voter participation
     */
    struct ProposalVote {
        uint256 forVotes;     // Total votes in favor
        uint256 againstVotes; // Total votes against
        mapping(address => bool) hasVoted; // Tracks who has voted
    }

    /**
     * @notice Core proposal data structure
     * @dev Contains all essential proposal information
     */
    struct ProposalCore {
        uint256 id;                  // Unique proposal identifier
        address proposer;            // Address that created the proposal
        ProposalType proposalType;   // Type of proposal
        uint256 startTime;           // Start of voting period
        uint256 endTime;             // End of voting period
        bool executed;               // Whether proposal has been executed
        bool canceled;               // Whether proposal has been canceled
        bytes32 descriptionHash;     // Hash of proposal description
        address[] targets;           // Target addresses for calls
        uint256[] values;           // ETH values for calls
        bytes[] calldatas;          // Calldata for each call
    }

     /**
     * @notice Struct to store parameter bounds and current value
     */
    struct ParameterConfig {
        uint256 minValue;
        uint256 maxValue;
        uint256 value;
    }


    /**
     * @notice Events emitted by the governance contract
     * @dev Events are organized by lifecycle stage: proposal creation, voting, execution, and admin actions
     */
    
    // Proposal lifecycle events
    /**
     * @notice Event emitted when a proposal is created
     */
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values, 
        bytes[] calldatas,
        string description,
        ProposalType indexed proposalType,
        uint256 startTime,
        uint256 endTime,
          uint256 proposerVotingPower
    );

    /**
     * @notice Event emitted when a proposal is canceled
     */
    event ProposalCanceled(
        uint256 indexed proposalId,
        address indexed canceler,
        string reason
    );

    /**
     * @notice Event emitted when a proposal is queued in the timelock
     */
    event ProposalQueued(
        uint256 indexed proposalId,
        uint256 executionTime,
        bytes32 timelockOperationId
    );

    /**
     * @notice Event emitted when a proposal is successfully executed
     */
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed executor,
        uint256 executionTime
    );

    // Voting events  
    /**
     * @notice Event emitted when a vote is cast
     */
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        bool support,
        uint256 votingPower,
        string reason
    );


    /**
     * @notice Event emitted when quorum is reached
     */
    event QuorumReached(uint256 indexed proposalId, uint256 totalVotes);

    // Admin configuration events
    /**
     * @notice Event emitted when voting delay is set
     */
    event VotingDelaySet(uint256 oldVotingDelay, uint256 newVotingDelay, address indexed admin);

    /**
     * @notice Event emitted when voting period is set
     */
    event VotingPeriodSet(uint256 oldVotingPeriod, uint256 newVotingPeriod, address indexed admin);

    /**
     * @notice Event emitted when proposal threshold is set
     */
    event ProposalThresholdSet(uint256 oldThreshold, uint256 newThreshold, address indexed admin);

    /**
     * @notice Event emitted when quorum numerator is set
     */
    event QuorumNumeratorSet(uint256 oldNumerator, uint256 newNumerator, address indexed admin);

    /**
     * @notice Event emitted when timelock address is set
     */
    event TimelockSet(address oldTimelock, address newTimelock, address indexed admin);

    /**
     * @notice Custom errors for governance operations
     */

    // Configuration errors
    /**
     * @notice Error emitted when voting delay is invalid
     */
    error InvalidVotingDelay(uint256 votingDelay, uint256 minDelay, uint256 maxDelay);

    /**
     * @notice Error emitted when voting period is invalid
     */
    error InvalidVotingPeriod(uint256 votingPeriod, uint256 minPeriod, uint256 maxPeriod);

    /**
     * @notice Error emitted when proposal threshold is invalid
     */
    error InvalidProposalThreshold(uint256 threshold, uint256 minThreshold, uint256 maxThreshold);

    /**
     * @notice Error emitted when quorum numerator is invalid
     */
    error InvalidQuorumNumerator(uint256 numerator, uint256 minNumerator, uint256 maxNumerator);

    /**
     * @notice Error emitted when timelock address is invalid
     */
    error InvalidTimelockAddress(address timelock, string reason);

    // Proposal creation/management errors
    /**
     * @notice Error emitted when proposer votes are insufficient
     */
    error InsufficientProposerVotes(address proposer, uint256 votes, uint256 threshold, string reason);

    /**
     * @notice Error emitted when proposal length is invalid
     */
    error InvalidProposalLength(uint256 targetsLength, uint256 valuesLength, uint256 calldataLength);

    /**
     * @notice Error emitted when proposal does not exist
     */
    error ProposalDoesNotExist(uint256 proposalId);

    /**
     * @notice Error emitted when proposal already exists
     */
    error ProposalAlreadyExists(uint256 proposalId);

    // Voting errors
    /**
     * @notice Error emitted when voting has not started
     */
    error VotingNotStarted(uint256 proposalId, uint256 startTime, uint256 currentTime);

    /**
     * @notice Error emitted when voting has ended
     */
    error VotingEnded(uint256 proposalId, uint256 endTime, uint256 currentTime);

    /**
     * @notice Error emitted when an account has already voted
     */
    error AlreadyVoted(uint256 proposalId, address voter, uint256 castTime);

    /**
     * @notice Error emitted when an account has no voting power
     */
    error NoVotingPower(address account, uint256 blockNumber);

    // Execution errors
    /**
     * @notice Error emitted when a proposal is not active
     */
    error ProposalNotActive(uint256 proposalId, ProposalState currentState);

    /**
     * @notice Error emitted when a proposal has already been executed
     */
    error ProposalAlreadyExecuted(uint256 proposalId, uint256 executionTime);

    /**
     * @notice Error emitted when a proposal is not successful
     */
    error ProposalNotSuccessful(uint256 proposalId, uint256 forVotes, uint256 againstVotes, uint256 quorum);

    /**
     * @notice Error emitted when a proposal is not queued
     */
    error ProposalNotQueued(uint256 proposalId, bytes32 timelockOperationId);

    /**
     * @notice Error emitted when a proposal state is invalid
     */
    error InvalidProposalState(
        uint256 proposalId,
        ProposalState current,
        ProposalState required,
        string reason
    );

    /**
     * @notice Core proposal functions
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        ProposalType proposalType
    ) external returns (uint256);

    /**
     * @notice Function to cast a vote on a proposal
     */
    function castVote(uint256 proposalId, bool support) external returns (uint256);

    /**
     * @notice Function to execute a proposal
     */
    function execute(uint256 proposalId) external;  

    /**
     * @notice Function to cancel a proposal
     */ 
    function cancel(uint256 proposalId) external;

    /**
     * @notice Admin functions for parameter setting
     */
    function setParameter(GovernanceParameter param, uint256 newValue) external;
    function setTimelock(address newTimelock) external;

    /**
     * @notice View functions
     */
    /**
     * @notice Function to get a proposal
     */
    function getProposal(uint256 proposalId) external view returns (ProposalCore memory);

    /**
     * @notice Function to get votes for a proposal
     */
    function getVotes(uint256 proposalId) external view returns (uint256 forVotes, uint256 againstVotes);
    function hasVoted(uint256 proposalId, address account) external view returns (bool);
    function state(uint256 proposalId) external view returns (ProposalState);
    function quorum() external view returns (uint256);

    /**
     * @notice Additional view functions for proposal data
     */
    function getProposalData(uint256 proposalId) external view returns (
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    );

    /**
     * @notice Debug information for proposals
     */
    function getDebugInfo(uint256 proposalId) external view returns (
        ProposalState currentState,
        uint256 startTime,
        uint256 endTime,
        uint256 currentTime,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 currentQuorum,
        uint256 requiredQuorum,
        bool isExecuted,
        bool isCanceled
    );

    function votingDelay() external view returns (uint256);
    function votingPeriod() external view returns (uint256);
    function proposalThreshold() external view returns (uint256);
    function quorumNumerator() external view returns (uint256);
    function timelock() external view returns (address);
    function veToken() external view returns (address);
}
