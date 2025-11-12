// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PrivateProposal.sol";
import "./IProposalFactory.sol";
import "./SpaceRegistry.sol";
import "./VotingUtils.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/// @title Factory for deploying new proposal instances with Chainlink automation
/// @notice Deploy and manage multiple proposal contracts from a single factory
/// @dev ONE Chainlink Upkeep monitors ALL proposals - highly scalable!
contract PrivateProposalFactory is IProposalFactory, AutomationCompatibleInterface {
    
    // ============ State Variables ============
    
    address public owner;
    SpaceRegistry public spaceRegistry;
    
    address[] public allVotings;
    mapping(string => address) public votingByName;
    mapping(address => uint256) public votingIndex;
    mapping(address => bool) public isValidVoting;
    mapping(address => bool) public isWhitelisted;
    mapping(address => address[]) public userVotings;
    mapping(address => bool) public isCancelled; // Track cancelled votings
    
    // Space-based organization - tracks proposals per space
    mapping(bytes32 => address[]) public spaceProposals; // spaceId => proposal addresses
    
    // ============ Events ============
    
    event VotingCreated(
        address indexed votingAddress,
        string name,
        uint256 voteDepositAmount,
        uint256 votingDuration,
        uint256 votingStartTime,
        uint256 votingEndTime,
        uint256 createdAt,
        address indexed creator
    );
    
    event VotingCancelled(address indexed votingAddress, string name, address indexed cancelledBy);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event WhitelistUpdated(address indexed user, bool status);
    event UserVoteRecorded(address indexed user, address indexed votingAddress);
    event UpkeepPerformed(address indexed votingAddress, uint256 timestamp);
    event UpkeepFailed(address indexed votingAddress, string reason);
    
    // ============ Errors (saves gas vs require strings) ============
    
    error OnlyOwner();
    error NotWhitelisted();
    error NotSpaceOwner();
    error SpaceNotExist();
    error ZeroAddr();
    error EmptyName();
    error NameTooLong();
    error NameUsed();
    error DurationShort();
    error DurationLong();
    error StartPast();
    error InvalidIdx();
    error NotValid();
    error OnlyValid();
    error InvalidDeposit();
    error Started();
    error NotCancellable();
    error Cancelled();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier onlyWhitelisted() {
        if (!isWhitelisted[msg.sender] && msg.sender != owner) revert NotWhitelisted();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _spaceRegistry) {
        if (_spaceRegistry == address(0)) revert ZeroAddr();
        owner = msg.sender;
        spaceRegistry = SpaceRegistry(_spaceRegistry);
        isWhitelisted[msg.sender] = true;
    }
    
    // ============ Whitelist Management ============
    
    function updateWhitelist(address user, bool status) external onlyOwner {
        if (user == address(0)) revert ZeroAddr();
        isWhitelisted[user] = status;
        emit WhitelistUpdated(user, status);
    }
    
    function batchUpdateWhitelist(address[] calldata users, bool status) external onlyOwner {
        uint256 len = users.length;
        for (uint256 i = 0; i < len; ) {
            if (users[i] == address(0)) revert ZeroAddr();
            isWhitelisted[users[i]] = status;
            emit WhitelistUpdated(users[i], status);
            unchecked { ++i; }
        }
    }
    
    // ============ Voting Creation ============
    
    /// @notice Create a new proposal instance
    /// @param params Proposal parameters
    /// @return proposal Address of the newly deployed proposal contract
    /// @return proposalId Unique identifier for the proposal
    function createProposal(CreateProposalParams memory params) external onlyWhitelisted returns (address proposal, bytes32 proposalId) {
        bytes memory nameBytes = bytes(params.title);
        if (nameBytes.length == 0) revert EmptyName();
        if (nameBytes.length > 200) revert NameTooLong();
        
        // Check that space exists and is active
        if (!spaceRegistry.spaceIsActive(params.spaceId)) revert SpaceNotExist();
        
        // Check space ownership - only space owner OR whitelisted user can create proposals
        if (!spaceRegistry.isSpaceOwner(params.spaceId, msg.sender) && !isWhitelisted[msg.sender]) {
            revert NotSpaceOwner();
        }
        
        // Check uniqueness globally (for now)
        if (votingByName[params.title] != address(0)) revert NameUsed();

        PrivateProposal proposalContract = new PrivateProposal(params);

        proposal = address(proposalContract);
        proposalId = keccak256(abi.encodePacked(params.spaceId, params.title, block.timestamp, msg.sender));

        uint256 index = allVotings.length;
        allVotings.push(proposal);
        votingByName[params.title] = proposal;
        votingIndex[proposal] = index;
        isValidVoting[proposal] = true;
        
        // Space-based organization
        spaceProposals[params.spaceId].push(proposal);
        userVotings[msg.sender].push(proposal);

        emit ProposalCreated(
            params.spaceId,
            proposalId,
            proposal,
            params
        );

        emit VotingCreated(
            proposal,
            params.title,
            0, // no deposit
            uint256(params.end - params.start),
            params.start,
            params.end,
            block.timestamp,
            msg.sender
        );
    }
    
    /// @notice Cancel a proposal before it starts (only creator or owner)
    /// @param votingAddress Address of the proposal to cancel
    function cancelVoting(address votingAddress) external {
        if (!isValidVoting[votingAddress]) revert NotValid();
        if (isCancelled[votingAddress]) revert Cancelled();
        
        PrivateProposal proposal = PrivateProposal(votingAddress);
        
        // Only creator or owner can cancel
        if (proposal.creator() != msg.sender && msg.sender != owner) revert NotWhitelisted();
        
        // Can only cancel before proposal starts
        if (block.timestamp >= proposal.start()) revert Started();
        
        string memory proposalName = proposal.title();
        
        // Mark as cancelled (cheaper than array removal)
        isCancelled[votingAddress] = true;
        isValidVoting[votingAddress] = false;
        delete votingByName[proposalName];
        
        emit VotingCancelled(votingAddress, proposalName, msg.sender);
    }
    
    function recordUserVote(address user, address votingAddress) external {
        if (!isValidVoting[msg.sender]) revert OnlyValid();
        userVotings[user].push(votingAddress);
        emit UserVoteRecorded(user, votingAddress);
    }
    
    // ============ Space Management ============
    
    /// @notice Get all proposals for a specific space
    /// @param spaceId The space identifier
    /// @return Array of proposal addresses in the space
    function getSpaceProposals(bytes32 spaceId) external view returns (address[] memory) {
        return spaceProposals[spaceId];
    }
    
    /// @notice Get space information
    /// @param spaceId The space identifier
    /// @return spaceOwner The space owner
    /// @return displayName The space display name
    /// @return proposalCount Number of proposals in the space
    function getSpaceInfo(bytes32 spaceId) external view returns (address spaceOwner, string memory displayName, uint256 proposalCount) {
        (string memory spaceName, , address ownerAddr, , ) = spaceRegistry.getSpace(spaceId);
        return (ownerAddr, spaceName, spaceProposals[spaceId].length);
    }
    
    // ============ View Functions ============
    
    function votingCount() external view returns (uint256) {
        return allVotings.length;
    }
    
    function getVoting(uint256 index) external view returns (address) {
        if (index >= allVotings.length) revert InvalidIdx();
        return allVotings[index];
    }
    
    function getAllVotings() external view returns (address[] memory) {
        return allVotings;
    }
    
    function getUpcomingVotings() external view returns (address[] memory) {
        return VotingUtils.filterVotings(allVotings, isCancelled, 0);
    }
    
    function getActiveVotings() external view returns (address[] memory) {
        return VotingUtils.filterVotings(allVotings, isCancelled, 1);
    }
    
    function getEndedVotings() external view returns (address[] memory) {
        return VotingUtils.filterVotings(allVotings, isCancelled, 2);
    }
    
    function getUserVotings(address user) external view returns (address[] memory) {
        return userVotings[user];
    }
    

    
    // ============ Chainlink Automation ============
    
    /// @notice Check if any votings need resolution (called by Chainlink off-chain)
    /// @dev Scans all votings and returns those ready for decryption
    /// @return upkeepNeeded True if at least one voting is ready
    /// @return performData Encoded array of voting addresses to process
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 len = allVotings.length;
        uint256 readyCount = 0;
        
        // First pass: count ready votings
        for (uint256 i = 0; i < len; ) {
            if (!isCancelled[allVotings[i]]) {
                PrivateProposal voting = PrivateProposal(allVotings[i]);
                if (block.timestamp >= voting.end() && 
                    !voting.resultsRevealed() && 
                    !voting.autoRevealTriggered()) {
                    unchecked { ++readyCount; }
                }
            }
            unchecked { ++i; }
        }
        
        upkeepNeeded = readyCount > 0;
        
        if (readyCount > 0) {
            address[] memory result = new address[](readyCount);
            uint256 resultIdx = 0;
            
            // Second pass: collect addresses
            for (uint256 i = 0; i < len; ) {
                if (!isCancelled[allVotings[i]]) {
                    PrivateProposal voting = PrivateProposal(allVotings[i]);
                    if (block.timestamp >= voting.end() && 
                        !voting.resultsRevealed() && 
                        !voting.autoRevealTriggered()) {
                        result[resultIdx] = allVotings[i];
                        unchecked { ++resultIdx; }
                    }
                }
                unchecked { ++i; }
            }
            performData = abi.encode(result);
        }
    }
    
    function performUpkeep(bytes calldata performData) external override {
        address[] memory votingsToResolve = abi.decode(performData, (address[]));
        uint256 len = votingsToResolve.length;
        uint256 maxBatch = len > 10 ? 10 : len;
        
        for (uint256 i = 0; i < maxBatch; ) {
            PrivateProposal voting = PrivateProposal(votingsToResolve[i]);
            
            // Conditions already verified in checkUpkeep, just trigger
            try voting.performUpkeep("") {
                emit UpkeepPerformed(votingsToResolve[i], block.timestamp);
            } catch Error(string memory reason) {
                emit UpkeepFailed(votingsToResolve[i], reason);
            } catch {
                emit UpkeepFailed(votingsToResolve[i], "Unknown error");
            }
            unchecked { ++i; }
        }
    }
    
    // ============ Admin Functions ============
    
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddr();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}