// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./zamahub.sol";

/// @title Factory for deploying new voting instances
/// @notice Deploy and manage multiple voting contracts from a single factory
/// @dev Each voting instance is independent with its own lifecycle
contract VotingFactory {
    
    // ============ State Variables ============
    
    /// @notice Factory owner (can update treasury/wheelpool addresses)
    address public owner;
    
    /// @notice Protocol treasury address for all voting instances
    address public protocolTreasury;
    
    /// @notice WheelPool address for all voting instances
    address public wheelPool;
    
    /// @notice USDC token address (MockUSDC or real USDC)
    address public usdcToken;
    
    /// @notice Array of all deployed voting contracts
    address[] public allVotings;
    
    /// @notice Mapping of voting name to address
    mapping(string => address) public votingByName;
    
    /// @notice Mapping of address to voting index
    mapping(address => uint256) public votingIndex;
    
    /// @notice Track if an address is a valid voting contract
    mapping(address => bool) public isValidVoting;
    
    // ============ Events ============
    
    event VotingCreated(
        address indexed votingAddress,
        string name,
        uint256 votingDuration,
        uint256 votingEndTime,
        uint256 createdAt
    );
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event WheelPoolUpdated(address indexed oldWheelPool, address indexed newWheelPool);
    event USDCTokenUpdated(address indexed oldToken, address indexed newToken);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "VotingFactory: only owner");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _protocolTreasury,
        address _wheelPool,
        address _usdcToken
    ) {
        require(_protocolTreasury != address(0), "VotingFactory: zero treasury");
        require(_wheelPool != address(0), "VotingFactory: zero wheelpool");
        require(_usdcToken != address(0), "VotingFactory: zero USDC token");
        
        owner = msg.sender;
        protocolTreasury = _protocolTreasury;
        wheelPool = _wheelPool;
        usdcToken = _usdcToken;
    }
    
    // ============ Voting Creation ============
    
    /// @notice Create a new voting instance
    /// @param name Question/name for this vote (e.g., "Should we add Feature X?")
    /// @param votingDuration Duration in seconds (e.g., 7 days = 604800)
    /// @return votingAddress Address of the newly deployed voting contract
    function createVoting(
        string memory name,
        uint256 votingDuration
    ) external onlyOwner returns (address votingAddress) {
        require(bytes(name).length > 0, "VotingFactory: empty name");
        require(bytes(name).length <= 200, "VotingFactory: name too long");
        require(votingByName[name] == address(0), "VotingFactory: name already used");
        require(votingDuration >= 1 hours, "VotingFactory: duration too short");
        require(votingDuration <= 365 days, "VotingFactory: duration too long");
        
        // Deploy new PrivateVoting contract
        PrivateVoting voting = new PrivateVoting(
            name,
            votingDuration,
            protocolTreasury,
            wheelPool
        );
        
        votingAddress = address(voting);
        
        // Set USDC token in the new voting contract
        voting.setUSDCToken(usdcToken);
        
        // Store references
        uint256 index = allVotings.length;
        allVotings.push(votingAddress);
        votingByName[name] = votingAddress;
        votingIndex[votingAddress] = index;
        isValidVoting[votingAddress] = true;
        
        uint256 votingEndTime = block.timestamp + votingDuration;
        
        emit VotingCreated(votingAddress, name, votingDuration, votingEndTime, block.timestamp);
        
        return votingAddress;
    }
    
    // ============ View Functions ============
    
    /// @notice Get total number of voting instances created
    function votingCount() external view returns (uint256) {
        return allVotings.length;
    }
    
    /// @notice Get voting address by index
    function getVoting(uint256 index) external view returns (address) {
        require(index < allVotings.length, "VotingFactory: invalid index");
        return allVotings[index];
    }
    
    /// @notice Get all voting addresses
    function getAllVotings() external view returns (address[] memory) {
        return allVotings;
    }
    
    /// @notice Get active voting instances (not yet ended)
    function getActiveVotings() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active votings
        for (uint256 i = 0; i < allVotings.length; i++) {
            PrivateVoting voting = PrivateVoting(allVotings[i]);
            if (block.timestamp < voting.votingEndTime()) {
                activeCount++;
            }
        }
        
        // Build array of active votings
        address[] memory activeVotings = new address[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < allVotings.length; i++) {
            PrivateVoting voting = PrivateVoting(allVotings[i]);
            if (block.timestamp < voting.votingEndTime()) {
                activeVotings[currentIndex] = allVotings[i];
                currentIndex++;
            }
        }
        
        return activeVotings;
    }
    
    /// @notice Get ended voting instances (past votingEndTime)
    function getEndedVotings() external view returns (address[] memory) {
        uint256 endedCount = 0;
        
        // Count ended votings
        for (uint256 i = 0; i < allVotings.length; i++) {
            PrivateVoting voting = PrivateVoting(allVotings[i]);
            if (block.timestamp >= voting.votingEndTime()) {
                endedCount++;
            }
        }
        
        // Build array of ended votings
        address[] memory endedVotings = new address[](endedCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < allVotings.length; i++) {
            PrivateVoting voting = PrivateVoting(allVotings[i]);
            if (block.timestamp >= voting.votingEndTime()) {
                endedVotings[currentIndex] = allVotings[i];
                currentIndex++;
            }
        }
        
        return endedVotings;
    }
    
    /// @notice Get voting info by address
    function getVotingInfo(address votingAddress) external view returns (
        string memory name,
        uint256 votingEndTime,
        bool resultsRevealed,
        bool votingResolved,
        uint256 totalVotingUSDC,
        bool isActive
    ) {
        require(isValidVoting[votingAddress], "VotingFactory: not a valid voting");
        
        PrivateVoting voting = PrivateVoting(votingAddress);
        
        name = voting.name();
        votingEndTime = voting.votingEndTime();
        resultsRevealed = voting.resultsRevealed();
        votingResolved = voting.votingResolved();
        totalVotingUSDC = voting.totalVotingUSDC();
        isActive = block.timestamp < votingEndTime;
    }
    
    // ============ Admin Functions ============
    
    /// @notice Update protocol treasury address for future voting instances
    /// @dev Does not affect already deployed voting contracts
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "VotingFactory: zero address");
        address oldTreasury = protocolTreasury;
        protocolTreasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /// @notice Update WheelPool address for future voting instances
    /// @dev Does not affect already deployed voting contracts
    function updateWheelPool(address newWheelPool) external onlyOwner {
        require(newWheelPool != address(0), "VotingFactory: zero address");
        address oldWheelPool = wheelPool;
        wheelPool = newWheelPool;
        emit WheelPoolUpdated(oldWheelPool, newWheelPool);
    }
    
    /// @notice Update USDC token address for future voting instances
    /// @dev Does not affect already deployed voting contracts
    function updateUSDCToken(address newUSDCToken) external onlyOwner {
        require(newUSDCToken != address(0), "VotingFactory: zero address");
        address oldToken = usdcToken;
        usdcToken = newUSDCToken;
        emit USDCTokenUpdated(oldToken, newUSDCToken);
    }
    
    /// @notice Transfer factory ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "VotingFactory: zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
