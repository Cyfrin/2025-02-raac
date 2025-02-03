// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "./TimelockController.sol";
import "../../../interfaces/core/governance/proposals/IGovernance.sol";
import "../../../interfaces/core/tokens/IveRAACToken.sol";

/**
 * @title Governance Contract
 * @notice Implements the core governance functionality for the RAAC protocol
 * @dev Allows veRAAC token holders to create and vote on proposals
 * @dev Includes timelock functionality for proposal execution
 * @dev Manages key protocol parameters through governance
 *
 * The governance process follows these steps:
 * 1. Proposal Creation - veRAAC holders above threshold can create proposals
 * 2. Voting Period - Token holders cast votes during the voting window
 * 3. Execution - Successful proposals are queued and executed through timelock
 *
 * Key Features:
 * - Configurable voting delay and period
 * - Adjustable proposal threshold and quorum requirements  
 * - Two-step execution process with timelock for security
 * - Support for multiple proposal types
 * - Comprehensive vote tracking and proposal state management
 */
contract Governance is IGovernance, Ownable, ReentrancyGuard {
    using SafeCast for uint256;
    
    /// @notice veRAAC token used for voting power
    IveRAACToken private immutable _veToken;
    function veToken() public view override returns (address) {
        return address(_veToken);
    }

    /// @notice Timelock controller for delayed execution
    TimelockController private _timelock;
    function timelock() public view override returns (address) {
        return address(_timelock);
    }
    
    /// @notice Delay before voting starts after proposal creation
    uint256 public votingDelay = 1 days;

    /// @notice Duration of voting period
    uint256 public votingPeriod = 7 days;

    /// @notice Minimum voting power required to create proposals
    uint256 public proposalThreshold = 100_000e18; // 100k veRAAC

    /// @notice Percentage of total voting power required for quorum
    uint256 public quorumNumerator = 4; // 4% quorum

    /// @notice Mapping of proposal ID to core proposal data
    mapping(uint256 => ProposalCore) private _proposals;

    /// @notice Mapping of proposal ID to vote tracking
    mapping(uint256 => ProposalVote) private _proposalVotes;

    /// @notice Total number of proposals created
    uint256 private _proposalCount;

    mapping(uint256 => ProposalData) private _proposalData;

    /// @notice Minimum and maximum voting delay bounds
    uint256 constant MIN_VOTING_DELAY = 1 hours;
    uint256 constant MAX_VOTING_DELAY = 2 weeks;

    /// @notice Minimum and maximum voting period bounds
    uint256 constant MIN_VOTING_PERIOD = 1 days;
    uint256 constant MAX_VOTING_PERIOD = 4 weeks;

    /// @notice Minimum and maximum proposal threshold bounds
    uint256 constant MIN_PROPOSAL_THRESHOLD = 1000e18;  // 1,000 veRAAC
    uint256 constant MAX_PROPOSAL_THRESHOLD = 1000000e18; // 1M veRAAC

    /// @notice Minimum and maximum quorum bounds
    uint256 constant MIN_QUORUM_NUMERATOR = 2;  // 2%
    uint256 constant MAX_QUORUM_NUMERATOR = 20; // 20%
    /// @notice Denominator for quorum calculation
    uint256 public constant QUORUM_DENOMINATOR = 100;

   
    /// @notice Mapping of parameter types to their configuration
    mapping(GovernanceParameter => ParameterConfig) private _parameters;

    /**
     * @notice Struct to store proposal data
     */
    struct ProposalData {
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        string description;
    }

    /**
     * @dev Constructor to initialize the Governance contract
     * @param _veTokenAddr Address of the veRAAC token contract
     * @param _timelockAddr Address of the timelock controller
     */
    constructor(address _veTokenAddr, address _timelockAddr) Ownable(msg.sender) {
        if (_veTokenAddr == address(0)) revert InvalidTimelockAddress(_veTokenAddr, "Zero address");
        if (_timelockAddr == address(0)) revert InvalidTimelockAddress(_timelockAddr, "Zero address");
        
        _veToken = IveRAACToken(_veTokenAddr);
        _timelock = TimelockController(_timelockAddr);

        _parameters[GovernanceParameter.VotingDelay] = ParameterConfig(MIN_VOTING_DELAY, MAX_VOTING_DELAY, 1 days);
        _parameters[GovernanceParameter.VotingPeriod] = ParameterConfig(MIN_VOTING_PERIOD, MAX_VOTING_PERIOD, 7 days);
        _parameters[GovernanceParameter.ProposalThreshold] = ParameterConfig(MIN_PROPOSAL_THRESHOLD, MAX_PROPOSAL_THRESHOLD, 100_000e18);
        _parameters[GovernanceParameter.QuorumNumerator] = ParameterConfig(MIN_QUORUM_NUMERATOR, MAX_QUORUM_NUMERATOR, 4);
    }

    /**
     * @dev Creates a new proposal
     * @param targets Array of target addresses for proposal actions
     * @param values Array of ETH values for proposal actions
     * @param calldatas Array of calldata for proposal actions
     * @param description Description of the proposal
     * @param proposalType Type of the proposal
     * @return proposalId The ID of the created proposal
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        ProposalType proposalType
    ) external override returns (uint256) {
        uint256 proposerVotes = _veToken.getVotingPower(msg.sender);

        if (proposerVotes < proposalThreshold) {
            revert InsufficientProposerVotes(msg.sender, proposerVotes, proposalThreshold, "Below threshold");
        }

        if (targets.length == 0 || targets.length != values.length || targets.length != calldatas.length) {
            revert InvalidProposalLength(targets.length, values.length, calldatas.length);
        }

        uint256 proposalId = _proposalCount++;
        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime = startTime + votingPeriod;

        _proposals[proposalId] = ProposalCore({
            id: proposalId,
            proposer: msg.sender,
            proposalType: proposalType,
            startTime: startTime,
            endTime: endTime,
            executed: false,
            canceled: false,
            descriptionHash: keccak256(bytes(description)),
            targets: targets,
            values: values,
            calldatas: calldatas
        });

        // Store the proposal data separately
        _proposalData[proposalId] = ProposalData(targets, values, calldatas, description);

        emit ProposalCreated(proposalId, msg.sender, targets, values, calldatas, description, proposalType, startTime, endTime, proposerVotes);

        return proposalId;
    }

    /**
     * @notice Casts a vote on a governance proposal
     * @dev Allows veToken holders to vote on active proposals
     * - One vote per proposal per address
     * - Vote weight based on veToken voting power
     * - Supports yes/no voting
     * - Voting window between start and end times
     * @param proposalId The ID of the proposal to vote on
     * @param support True to vote in favor, false to vote against
     * @return weight The voting power used for this vote
     */
    function castVote(uint256 proposalId, bool support) external override returns (uint256) {
        ProposalCore storage proposal = _proposals[proposalId];
        if (proposal.startTime == 0) revert ProposalDoesNotExist(proposalId);
        if (block.timestamp < proposal.startTime) {
            revert VotingNotStarted(proposalId, proposal.startTime, block.timestamp);
        }
        if (block.timestamp > proposal.endTime) {
            revert VotingEnded(proposalId, proposal.endTime, block.timestamp);
        }

        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        if (proposalVote.hasVoted[msg.sender]) {
            revert AlreadyVoted(proposalId, msg.sender, block.timestamp);
        }

        uint256 weight = _veToken.getVotingPower(msg.sender);
        if (weight == 0) {
            revert NoVotingPower(msg.sender, block.number);
        }

        proposalVote.hasVoted[msg.sender] = true;

        if (support) {
            proposalVote.forVotes += weight;
        } else {
            proposalVote.againstVotes += weight;
        }

        emit VoteCast(msg.sender, proposalId, support, weight, "");
        return weight;
    }

    /**
     * @notice Executes a successful proposal through the timelock
     * @dev Two-step execution process:
     * 1. Queue - Schedule proposal in timelock when vote succeeds
     * 2. Execute - Execute proposal after timelock delay
     * @param proposalId The ID of the proposal to execute
     */
    function execute(uint256 proposalId) external override nonReentrant {
        ProposalCore storage proposal = _proposals[proposalId];
        if (proposal.executed) revert ProposalAlreadyExecuted(proposalId, block.timestamp);
        
        ProposalState currentState = state(proposalId);
        
        // Check if the proposal is in the correct state for execution
        if (currentState == ProposalState.Succeeded) {
            // Queue the proposal
            _queueProposal(proposalId);
        } else if (currentState == ProposalState.Queued) {
            // Execute the queued proposal
            _executeProposal(proposalId);
        } else {
            // If not in Succeeded or Queued state, revert
            revert InvalidProposalState(
                proposalId,
                currentState,
                currentState == ProposalState.Active ? ProposalState.Succeeded : ProposalState.Queued,
                "Invalid state for execution"
            );
        }
    }

    /**
     * @notice Cancels an active proposal
     * @dev Allows cancellation by proposer or if proposer's voting power drops below threshold
     * - Only cancellable before execution
     * - Proposer can always cancel their proposal
     * - Automatic cancellation if proposer loses required voting power
     * @param proposalId The ID of the proposal to cancel
     */
    function cancel(uint256 proposalId) external override {
        ProposalCore storage proposal = _proposals[proposalId];
        if (proposal.startTime == 0) revert ProposalDoesNotExist(proposalId);
        
        ProposalState currentState = state(proposalId);
        if (currentState == ProposalState.Executed) {
            revert InvalidProposalState(proposalId, currentState, ProposalState.Active, "Cannot cancel executed proposal");
        }

        // Only proposer or if proposer's voting power dropped below threshold
        if (msg.sender != proposal.proposer && 
            _veToken.getVotingPower(proposal.proposer) >= proposalThreshold) {
            revert InsufficientProposerVotes(proposal.proposer, 
                _veToken.getVotingPower(proposal.proposer), proposalThreshold, "Proposer lost required voting power");
        }

        proposal.canceled = true;
        emit ProposalCanceled(proposalId, msg.sender, "Proposal canceled by proposer");
    }

    // View Functions

    /**
     * @notice Returns the current state of a proposal
     * @dev Determines proposal state based on timing, votes, and execution status
     * Key states:
     * - Pending: Before voting starts
     * - Active: During voting period
     * - Defeated: Failed to meet quorum or majority
     * - Succeeded: Passed vote but not queued
     * - Queued: Scheduled in timelock
     * - Executed: Proposal actions completed
     * - Canceled: Proposal canceled by proposer
     * @param proposalId The ID of the proposal to check
     * @return Current ProposalState enum value
     */
    function state(uint256 proposalId) public view override returns (ProposalState) {
        ProposalCore storage proposal = _proposals[proposalId];
        if (proposal.startTime == 0) revert ProposalDoesNotExist(proposalId);

        if (proposal.canceled) return ProposalState.Canceled;
        if (proposal.executed) return ProposalState.Executed;
        if (block.timestamp < proposal.startTime) return ProposalState.Pending;
        if (block.timestamp < proposal.endTime) return ProposalState.Active;

        // After voting period ends, check quorum and votes
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        uint256 currentQuorum = proposalVote.forVotes + proposalVote.againstVotes;
        uint256 requiredQuorum = quorum();

        // Check if quorum is met and votes are in favor
        if (currentQuorum < requiredQuorum || proposalVote.forVotes <= proposalVote.againstVotes) {
            return ProposalState.Defeated;
        }

        bytes32 id = _timelock.hashOperationBatch(
            proposal.targets,
            proposal.values,
            proposal.calldatas,
            bytes32(0),
            proposal.descriptionHash
        );

        // If operation is pending in timelock, it's Queued
        if (_timelock.isOperationPending(id)) {
            return ProposalState.Queued;
        }

        // If not pending and voting passed, it's Succeeded
        return ProposalState.Succeeded;
    }

    /**
     * @notice Gets vote counts for a proposal
     * @dev Returns the current for and against vote totals
     * @param proposalId The ID of the proposal to query
     * @return forVotes Number of votes in favor
     * @return againstVotes Number of votes against
     */
    function getVotes(uint256 proposalId) external view override returns (uint256 forVotes, uint256 againstVotes) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return (proposalVote.forVotes, proposalVote.againstVotes);
    }

    /**
     * @notice Checks if an account has voted on a proposal
     * @dev Returns voting status for a specific account
     * @param proposalId The ID of the proposal to check
     * @param account The address to check voting status for
     * @return True if the account has cast a vote
     */
    function hasVoted(uint256 proposalId, address account) external view override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account];
    }

    /**
     * @notice Gets the current quorum requirement
     * @dev Calculates required quorum based on total voting power
     * Uses quorumNumerator/QUORUM_DENOMINATOR ratio
     * @return Current quorum threshold in voting power units
     */
    function quorum() public view override returns (uint256) {
        return (_veToken.getTotalVotingPower() * quorumNumerator) / QUORUM_DENOMINATOR;
    }

    // Admin Functions

    /**
     * @notice Updates a governance parameter
     * @dev Only callable by contract owner
     * @param param The parameter to update
     * @param newValue The new value to set
     */
    function setParameter(GovernanceParameter param, uint256 newValue) external override onlyOwner {
        ParameterConfig storage config = _parameters[param];
        
        if (newValue < config.minValue || newValue > config.maxValue) {
            if (param == GovernanceParameter.VotingDelay) revert InvalidVotingDelay(newValue, config.minValue, config.maxValue);
            if (param == GovernanceParameter.VotingPeriod) revert InvalidVotingPeriod(newValue, config.minValue, config.maxValue);
            if (param == GovernanceParameter.ProposalThreshold) revert InvalidProposalThreshold(newValue, config.minValue, config.maxValue);
            if (param == GovernanceParameter.QuorumNumerator) revert InvalidQuorumNumerator(newValue, config.minValue, config.maxValue);
        }

        uint256 oldValue = config.value;
        config.value = newValue;

        if (param == GovernanceParameter.VotingDelay) {
            votingDelay = newValue;
            emit VotingDelaySet(oldValue, newValue, msg.sender);
        } else if (param == GovernanceParameter.VotingPeriod) {
            votingPeriod = newValue;
            emit VotingPeriodSet(oldValue, newValue, msg.sender);
        } else if (param == GovernanceParameter.ProposalThreshold) {
            proposalThreshold = newValue;
            emit ProposalThresholdSet(oldValue, newValue, msg.sender);
        } else if (param == GovernanceParameter.QuorumNumerator) {
            quorumNumerator = newValue;
            emit QuorumNumeratorSet(oldValue, newValue, msg.sender);
        }
    }

    /**
     * @notice Updates the timelock controller address
     * @dev Only callable by contract owner
     * Validates new timelock is not zero address
     * @param newTimelock Address of new timelock controller
     */
    function setTimelock(address newTimelock) external onlyOwner {
        if (newTimelock == address(0)) revert InvalidTimelockAddress(newTimelock, "Zero address");
        address oldTimelock = address(_timelock);
        _timelock = TimelockController(newTimelock);
        emit TimelockSet(oldTimelock, newTimelock, msg.sender);
    }

    /**
     * @notice Gets full proposal details
     * @dev Returns core proposal data
     * @param proposalId The ID of the proposal to query
     * @return Full ProposalCore struct
     */
    function getProposal(uint256 proposalId) external view override returns (ProposalCore memory) {
        ProposalCore memory proposal = _proposals[proposalId];
        if (proposal.startTime == 0) revert ProposalDoesNotExist(proposalId);
        return proposal;
    }

    /**
     * @notice Gets proposal transaction data
     * @dev Returns arrays of targets, values, and calldata
     * @param proposalId The ID of the proposal
     * @return targets Array of target addresses
     * @return values Array of ETH values
     * @return calldatas Array of calldata bytes
     * @return description Proposal description string
     */
    function getProposalData(uint256 proposalId) public view returns (
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) {
        if (_proposals[proposalId].startTime == 0) revert ProposalDoesNotExist(proposalId);
        ProposalData storage data = _proposalData[proposalId];
        return (data.targets, data.values, data.calldatas, data.description);
    }

    /**
     * @notice Gets detailed proposal status info
     * @dev Returns comprehensive proposal state for debugging
     * @param proposalId The ID of the proposal
     * @return currentState Current ProposalState
     * @return startTime Voting start timestamp
     * @return endTime Voting end timestamp
     * @return currentTime Current block timestamp
     * @return forVotes Number of votes in favor
     * @return againstVotes Number of votes against
     * @return currentQuorum Current vote total
     * @return requiredQuorum Required vote threshold
     * @return isExecuted Whether proposal is executed
     * @return isCanceled Whether proposal is canceled
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
    ) {
        ProposalCore storage proposal = _proposals[proposalId];
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        
        return (
            state(proposalId),
            proposal.startTime,
            proposal.endTime,
            block.timestamp,
            proposalVote.forVotes,
            proposalVote.againstVotes,
            proposalVote.forVotes + proposalVote.againstVotes,
            quorum(),
            proposal.executed,
            proposal.canceled
        );
    }

    /**
     * @notice Queues a successful proposal in timelock
     * @dev Internal function to schedule timelock execution
     * @param proposalId The ID of the proposal to queue
     */
    function _queueProposal(uint256 proposalId) internal {
        ProposalCore storage proposal = _proposals[proposalId];
        
        bytes32 salt = proposal.descriptionHash;
        bytes32 id = _timelock.hashOperationBatch(
            proposal.targets,
            proposal.values,
            proposal.calldatas,
            bytes32(0),
            salt
        );

        // Check if already queued
        if (_timelock.isOperationPending(id)) {
            revert ProposalAlreadyExecuted(proposalId, block.timestamp);
        }

        // Schedule in timelock
        _timelock.scheduleBatch(
            proposal.targets,
            proposal.values,
            proposal.calldatas,
            bytes32(0),
            salt,
            _timelock.getMinDelay()
        );

        emit ProposalQueued(proposalId, block.timestamp, id);
    }

    /**
     * @notice Executes a queued proposal via timelock
     * @dev Internal function to execute timelock transaction
     * @param proposalId The ID of the proposal to execute
     */
    function _executeProposal(uint256 proposalId) internal {
        ProposalCore storage proposal = _proposals[proposalId];
        
        bytes32 salt = proposal.descriptionHash;
        bytes32 id = _timelock.hashOperationBatch(
            proposal.targets,
            proposal.values,
            proposal.calldatas,
            bytes32(0),
            salt
        );

        // Check if ready for execution
        if (!_timelock.isOperationReady(id)) {
            revert ProposalNotQueued(proposalId, id);
        }

        // Execute through timelock
        _timelock.executeBatch(
            proposal.targets,
            proposal.values,
            proposal.calldatas,
            bytes32(0),
            salt
        );

        proposal.executed = true;
        emit ProposalExecuted(proposalId, msg.sender, block.timestamp);
    }

    /**
     * @notice Checks if a proposal meets success criteria
     * @dev Internal view function to validate quorum and vote counts
     * @param proposalId The ID of the proposal to check
     * @return True if proposal meets success conditions
     */
    function _isProposalSuccessful(uint256 proposalId) internal view returns (bool) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        uint256 currentQuorum = proposalVote.forVotes + proposalVote.againstVotes;
        uint256 requiredQuorum = quorum();
        
        return currentQuorum >= requiredQuorum && 
               proposalVote.forVotes > proposalVote.againstVotes;
    }
}