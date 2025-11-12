// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, externalEuint64, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./IProposalFactory.sol";
import "./IPrivateProposal.sol";

interface IVotingFactory {
    function recordUserVote(address user, address votingAddress) external;
}

// ============ Enums and Structs ============

// Using enums and structs from IProposalFactory for consistency

/// @title Private Proposal System (Factory-Managed)
/// @notice Create proposals with encrypted votes using FHE
/// @dev Uses FHE for complete privacy of votes until reveal
/// @dev Factory-based automation: Chainlink triggers resolution
contract PrivateProposal is IPrivateProposal, SepoliaConfig {
    
    // ============ State Variables ============
    
    // Identity & metadata
    bytes32 public spaceId;
    string public title;
    string public bodyURI;
    string public discussionURI;
    string public app;
    
    // Choices & type
    ProposalType public pType;
    string[] public choices;
    
    // Timing
    uint64 public start;
    uint64 public end;
    
    // Governance rules
    QuorumMode public quorumMode;
    uint256 public quorumValue;
    ThresholdMode public thresholdMode;
    uint256 public thresholdValue;
    bool public abstainCountsTowardQuorum;
    RevealPolicy public revealPolicy;
    
    // FHE
    FHEConfig public fhe;
    
    // Execution
    address[] public execTargets;
    uint256[] public execValues;
    bytes[] public execCalldatas;
    address public execStrategy;
    
    /// @notice Factory address (can trigger resolution)
    address public factory;
    
    /// @notice Creator of this proposal
    address public creator;
    
    /// @notice Track if user has voted
    mapping(address => bool) public hasVoted;
    
    /// @notice Encrypted votes for each user (choice index)
    mapping(address => euint8) private _userVotes;
    
    /// @notice Encrypted vote counts for each choice
    euint64[] private _choiceVotes;
    
    /// @notice Decrypted vote counts after reveal
    uint256[] public choiceVotes;
    
    /// @notice Whether results are revealed
    bool public resultsRevealed;
    
    /// @notice Whether proposal has been resolved
    bool public proposalResolved;
    
    /// @notice Whether proposal passed
    bool public proposalPassed;
    
    /// @notice Winning choice index
    uint8 public winningChoice;
    
    /// @notice Track decryption request IDs for vote tallies
    uint256 private _latestTallyRequestId;
    
    /// @notice Track if auto-reveal has been triggered by Chainlink
    bool public autoRevealTriggered;
    
    // ============ Events ============
    
    event Voted(address indexed user, uint256 timestamp);
    event ResultsRevealed(uint256[] choiceVotes);
    event ProposalResolved(uint8 winningChoice, bool passed);
    event ReadyToReveal(uint256 timestamp);
    event TallyDecryptionRequested(uint256 indexed requestId);
    
    // ============ Modifiers ============
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Proposal: only factory");
        _;
    }
    
    modifier proposalActive() {
        require(block.timestamp >= start, "Proposal: proposal not started yet");
        require(block.timestamp < end, "Proposal: proposal has ended");
        _;
    }
    
    modifier proposalEnded() {
        require(block.timestamp >= end, "Proposal: proposal still active");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(CreateProposalParams memory params) {
        require(params.choices.length >= 2 && params.choices.length <= 10, "Proposal: invalid number of choices");
        require(params.end > params.start && params.end - params.start >= 5 minutes, "Proposal: invalid timing");
        if (params.start == 0) {
            start = uint64(block.timestamp);
        } else {
            require(params.start >= block.timestamp, "Proposal: start time in past");
            start = params.start;
        }
        end = params.end;
        
        factory = msg.sender;
        creator = tx.origin;
        
        spaceId = params.spaceId;
        title = params.title;
        bodyURI = params.bodyURI;
        discussionURI = params.discussionURI;
        app = params.app;
        pType = params.pType;
        choices = params.choices;
        quorumMode = params.quorumMode;
        quorumValue = params.quorumValue;
        thresholdMode = params.thresholdMode;
        thresholdValue = params.thresholdValue;
        abstainCountsTowardQuorum = params.abstainCountsTowardQuorum;
        revealPolicy = params.revealPolicy;
        fhe = params.fhe;
        execTargets = params.execTargets;
        execValues = params.execValues;
        execCalldatas = params.execCalldatas;
        execStrategy = params.execStrategy;
        
        // Initialize encrypted vote counters only if FHE is enabled
        if (fhe.enabled) {
            _choiceVotes = new euint64[](choices.length);
            for (uint256 i = 0; i < choices.length; i++) {
                _choiceVotes[i] = FHE.asEuint64(0);
                FHE.allowThis(_choiceVotes[i]);
            }
        } else {
            // Initialize decrypted vote counters for non-FHE proposals
            choiceVotes = new uint256[](choices.length);
        }
    }
    
    // ============ View Functions ============
    
    /// @notice Get user's encrypted vote (FHE enabled proposals only)
    function voteOf(address account) external view returns (euint8) {
        require(fhe.enabled, "Proposal: FHE not enabled for this proposal");
        return _userVotes[account];
    }
    
    /// @notice Get encrypted vote counts for a choice (FHE enabled proposals only)
    function votesChoice(uint8 index) external view returns (euint64) {
        require(fhe.enabled, "Proposal: FHE enabled proposals only");
        require(resultsRevealed, "Proposal: results not revealed yet");
        require(index < choices.length, "Proposal: invalid choice index");
        return _choiceVotes[index];
    }
    
    /// @notice Get time until proposal starts
    function timeUntilProposalStarts() external view returns (uint256) {
        if (block.timestamp >= start) {
            return 0;
        }
        return start - block.timestamp;
    }
    
    /// @notice Get time remaining until proposal ends
    function timeUntilProposalEnds() external view returns (uint256) {
        if (block.timestamp >= end) {
            return 0;
        }
        return end - block.timestamp;
    }

    /// @notice Get the number of choices
    function choicesLength() external view returns (uint256) {
        return choices.length;
    }

    // ============ Voting Functions ============
    
    /// @notice Vote for a choice (ENCRYPTED INPUT - FHE enabled proposals)
    /// @param inputEuint8 Encrypted choice index handle
    /// @param inputProof Input proof for encrypted vote
    function vote(externalEuint8 inputEuint8, bytes calldata inputProof) external proposalActive {
        require(fhe.enabled, "Proposal: FHE not enabled for this proposal");
        require(!hasVoted[msg.sender], "Proposal: already voted");
        
        // Store encrypted vote
        _userVotes[msg.sender] = FHE.fromExternal(inputEuint8, inputProof);
        
        // Increment vote counters using encrypted comparison
        for (uint256 i = 0; i < choices.length; i++) {
            _choiceVotes[i] = FHE.add(
                _choiceVotes[i],
                FHE.select(FHE.eq(_userVotes[msg.sender], FHE.asEuint8(uint8(i))), FHE.asEuint64(1), FHE.asEuint64(0))
            );
            FHE.allowThis(_choiceVotes[i]);
        }
        
        // Mark as voted
        hasVoted[msg.sender] = true;
        FHE.allowThis(_userVotes[msg.sender]);
        
        // Notify factory
        IVotingFactory(factory).recordUserVote(msg.sender, address(this));
        
        emit Voted(msg.sender, block.timestamp);
    }
    
    /// @notice Vote for a choice (PLAIN INPUT - FHE disabled proposals)
    /// @param choiceIndex Index of the choice to vote for
    function votePlain(uint8 choiceIndex) external proposalActive {
        require(!fhe.enabled, "Proposal: FHE enabled, use encrypted vote");
        require(!hasVoted[msg.sender], "Proposal: already voted");
        require(choiceIndex < choices.length, "Proposal: invalid choice index");
        
        // Increment vote counter
        choiceVotes[choiceIndex]++;
        
        // Mark as voted
        hasVoted[msg.sender] = true;
        
        // Notify factory
        IVotingFactory(factory).recordUserVote(msg.sender, address(this));
        
        emit Voted(msg.sender, block.timestamp);
    }
    
    // ============ Resolution Functions ============
    
    /// @notice Trigger resolution (called by factory's performUpkeep)
    function performUpkeep(bytes calldata /* performData */) external onlyFactory {
        require(block.timestamp >= end, "Proposal: proposal still active");
        require(!resultsRevealed, "Proposal: results already revealed");
        
        if (fhe.enabled) {
            require(!autoRevealTriggered, "Proposal: auto-reveal already triggered");
            require(_latestTallyRequestId == 0, "Proposal: decryption already requested");
            
            // Mark as triggered
            autoRevealTriggered = true;
            
            // Request decryption for all choice votes
            bytes32[] memory cts = new bytes32[](choices.length);
            for (uint256 i = 0; i < choices.length; i++) {
                cts[i] = FHE.toBytes32(_choiceVotes[i]);
            }
            
            // Request decryption from oracle
            _latestTallyRequestId = FHE.requestDecryption(cts, this.resolveProposalCallback.selector);
            
            emit ReadyToReveal(block.timestamp);
            emit TallyDecryptionRequested(_latestTallyRequestId);
        } else {
            // For non-FHE proposals, results are already available
            resultsRevealed = true;
            _resolveProposalInternal();
        }
    }
    
    /// @notice Callback function called by DecryptionOracle with decrypted vote tallies
    function resolveProposalCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) public {
        require(requestId == _latestTallyRequestId, "Proposal: invalid request ID");
        
        // Verify signatures
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        // Decode the decrypted vote counts
        uint64[] memory decryptedVotes = abi.decode(cleartexts, (uint64[]));
        require(decryptedVotes.length == choices.length, "Proposal: invalid decrypted data");
        
        // Store decrypted values
        choiceVotes = new uint256[](choices.length);
        for (uint256 i = 0; i < choices.length; i++) {
            choiceVotes[i] = uint256(decryptedVotes[i]);
        }
        
        resultsRevealed = true;
        
        // Automatically resolve proposal
        _resolveProposalInternal();
    }
    
    /// @notice Internal function to resolve proposal
    function _resolveProposalInternal() internal {
        require(resultsRevealed, "Proposal: results not revealed yet");
        require(!proposalResolved, "Proposal: already resolved");
        
        // Find abstain index
        uint256 abstainIndex = type(uint256).max;
        for (uint256 i = 0; i < choices.length; i++) {
            if (keccak256(abi.encodePacked(choices[i])) == keccak256(abi.encodePacked("Abstain"))) {
                abstainIndex = i;
                break;
            }
        }
        
        // Calculate total votes
        uint256 totalVotes = 0;
        for (uint256 i = 0; i < choices.length; i++) {
            totalVotes += choiceVotes[i];
        }
        
        // Calculate total for quorum
        uint256 totalForQuorum = totalVotes;
        if (!abstainCountsTowardQuorum && abstainIndex != type(uint256).max) {
            totalForQuorum -= choiceVotes[abstainIndex];
        }
        
        // Check quorum
        bool quorumMet = false;
        if (quorumMode == QuorumMode.Absolute) {
            quorumMet = totalForQuorum >= quorumValue;
        } else {
            quorumMet = totalForQuorum * 10000 >= totalVotes * quorumValue;
        }
        
        // Find winning choice
        uint256 maxVotes = 0;
        winningChoice = 0;
        for (uint256 i = 0; i < choices.length; i++) {
            if (choiceVotes[i] > maxVotes) {
                maxVotes = choiceVotes[i];
                winningChoice = uint8(i);
            }
        }
        
        // Check threshold
        bool thresholdMet = false;
        if (thresholdMode == ThresholdMode.SimpleMajority) {
            thresholdMet = maxVotes > totalVotes / 2;
        } else {
            thresholdMet = maxVotes * 10000 > totalVotes * thresholdValue;
        }
        
        // Determine if proposal passes
        proposalPassed = quorumMet && thresholdMet;
        
        proposalResolved = true;
        
        emit ProposalResolved(winningChoice, proposalPassed);
    }
    

}