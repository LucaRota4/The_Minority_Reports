// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, externalEuint64, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IWheelPool {
    function recordDeposit(uint256 amount) external;
}

/// @title Private Voting System with USDC (Fully Autonomous & Permissionless)
/// @notice Vote on 3 options by depositing exactly 10 USDC - votes and results are encrypted until reveal
/// @dev Uses FHE for complete privacy of votes and tallies until voting ends
/// @dev ONE-STEP RESOLUTION: Call decryptAndResolve() → oracle callback → automatically resolves everything
/// 
/// @dev ✅ FULLY AUTOMATIC WORKFLOW (Chainlink + Zama Oracle Pattern):
/// - TIME T: Chainlink Keeper automatically calls performUpkeep()
/// - performUpkeep() → requests decryption from oracle (like decryptWinningAddress())
/// - Oracle → calls resolveVotingCallback() with decrypted values
/// - Callback → automatically resolves voting and distributes to WheelPool (no manual action needed)
/// - Users → call claimReward() with automatic vote decryption
/// 
/// @dev SECURITY MODEL - DecryptionOracle Pattern:
/// - Users CANNOT directly decrypt their votes (no FHE.allow() permission given)
/// - All decryption happens via Zama's DecryptionOracle with cryptographic proofs
/// - Vote tallies: Chainlink triggers → oracle calls back → auto-resolves
/// - Individual votes: claimReward() auto-requests decryption if needed
/// - This prevents users from lying about their votes to manipulate rewards
contract PrivateVoting is SepoliaConfig, AutomationCompatibleInterface {
    
    // ============ State Variables ============
    
    string public name;
    
    /// @notice USDC token address
    address public usdcToken;
    
    /// @notice Owner who can set USDC and reveal results
    address public owner;
    
    /// @notice Protocol treasury address receiving 2% fees
    address public protocolTreasury;
    
    /// @notice WheelPool contract address receiving 5% of surplus
    address public wheelPool;
    
    /// @notice Fixed USDC deposit amount for voting (10 USDC with 6 decimals)
    uint256 public constant VOTE_DEPOSIT_AMOUNT = 10 * 10**6;
    
    /// @notice Fee percentage (2%)
    uint256 public constant FEE_PERCENTAGE = 2;
    
    /// @notice WheelPool percentage of surplus (5%)
    uint256 public constant WHEEL_POOL_PERCENTAGE = 5;
    
    /// @notice Voting end timestamp - results can only be revealed after this
    uint256 public votingEndTime;
    
    /// @notice Track if user has already voted
    mapping(address => bool) public hasVoted;
    
    /// @notice Encrypted votes for each user (0, 1, or 2 for options A, B, C)
    mapping(address => euint8) private _userVotes;
    
    /// @notice Encrypted vote counts for each option (hidden until reveal)
    euint64 private _votesOptionA;
    euint64 private _votesOptionB;
    euint64 private _votesOptionC;
    
    /// @notice Total USDC collected from voting (after fees)
    uint256 public totalVotingUSDC;
    
    /// @notice Total fees collected (2% of deposits)
    uint256 public totalFeesCollected;
    
    /// @notice Whether voting has ended and results are revealed
    bool public resultsRevealed;
    
    /// @notice Whether voting has been resolved (minority/middle/majority determined)
    bool public votingResolved;
    
    /// @notice Decrypted vote counts after reveal
    uint256 public votesA;
    uint256 public votesB;
    uint256 public votesC;
    
    /// @notice Store decrypted votes after reveal (automatically via oracle callback)
    mapping(address => uint8) public decryptedVotes;
    mapping(address => bool) public voteDecrypted;
    
    /// @notice Track decryption request IDs for vote tallies
    uint256 private _latestTallyRequestId;
    
    /// @notice Track decryption request IDs for individual user votes
    mapping(address => uint256) private _userVoteRequestId;
    
    /// @notice Reverse mapping from requestId to user address for callbacks
    mapping(uint256 => address) private _requestIdToUser;
    
    /// @notice Options ranked by votes (0=A, 1=B, 2=C)
    uint8 public minorityOption;
    uint8 public middleOption;
    uint8 public majorityOption;
    
    /// @notice Multipliers for each ranking (in basis points, 100 = 1x)
    uint256 public minorityMultiplier; // Usually 200 (2x)
    uint256 public middleMultiplier;   // Usually 100 (1x)
    uint256 public majorityMultiplier; // Usually 0 (0x)
    
    /// @notice Track if user has claimed their reward
    mapping(address => bool) public hasClaimedReward;
    
    /// @notice Track if auto-reveal has been triggered by Chainlink
    bool public autoRevealTriggered;
    
    // ============ Events ============
    
    event VoteDeposit(address indexed user, uint256 usdcAmount, uint256 feeAmount, uint256 timestamp);
    event USDCTokenSet(address indexed token);
    event VotingEnded(uint256 timestamp);
    event ResultsRevealed(uint256 optionA, uint256 optionB, uint256 optionC);
    event VotingResolved(uint8 minorityOption, uint8 middleOption, uint8 majorityOption, uint256 wheelPoolAmount);
    event RewardClaimed(address indexed user, uint8 voteOption, uint256 rewardAmount);
    event ReadyToReveal(uint256 timestamp);
    event TallyDecryptionRequested(uint256 indexed requestId);
    event UserVoteDecryptionRequested(address indexed user, uint256 indexed requestId);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Voting: only owner");
        _;
    }
    
    modifier votingActive() {
        require(block.timestamp < votingEndTime, "Voting: voting has ended");
        _;
    }
    
    modifier votingEnded() {
        require(block.timestamp >= votingEndTime, "Voting: voting still active");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        string memory _name, 
        uint256 _votingDuration,
        address _protocolTreasury,
        address _wheelPool
    ) {
        require(_protocolTreasury != address(0), "Voting: zero treasury address");
        require(_wheelPool != address(0), "Voting: zero wheelpool address");
        
        name = _name;
        owner = msg.sender;
        votingEndTime = block.timestamp + _votingDuration;
        protocolTreasury = _protocolTreasury;
        wheelPool = _wheelPool;
        
        // Initialize vote counters (encrypted) with permissions
        _votesOptionA = FHE.asEuint64(0);
        FHE.allowThis(_votesOptionA);
        
        _votesOptionB = FHE.asEuint64(0);
        FHE.allowThis(_votesOptionB);
        
        _votesOptionC = FHE.asEuint64(0);
        FHE.allowThis(_votesOptionC);
    }
    
    // ============ Admin Functions ============
    
    /// @notice Set the USDC token address (can only be set once by owner)
    function setUSDCToken(address _usdcToken) external onlyOwner {
        require(_usdcToken != address(0), "Voting: invalid USDC address");
        require(usdcToken == address(0), "Voting: USDC token already set");
        usdcToken = _usdcToken;
        emit USDCTokenSet(_usdcToken);
    }
    
    // ============ View Functions ============
    
    /// @notice Get user's encrypted vote (only visible to the user)
    function voteOf(address account) external view returns (euint8) {
        return _userVotes[account];
    }
    
    /// @notice Get encrypted vote counts (only accessible after reveal)
    function votesOptionA() external view returns (euint64) {
        require(resultsRevealed, "Voting: results not revealed yet");
        return _votesOptionA;
    }
    
    function votesOptionB() external view returns (euint64) {
        require(resultsRevealed, "Voting: results not revealed yet");
        return _votesOptionB;
    }
    
    function votesOptionC() external view returns (euint64) {
        require(resultsRevealed, "Voting: results not revealed yet");
        return _votesOptionC;
    }
    
    // ============ Voting Functions ============
    
    /// @notice Deposit exactly 10 USDC and vote for an option (ENCRYPTED INPUT)
    /// @param inputEuint8 Encrypted vote option handle (0 = Option A, 1 = Option B, 2 = Option C)
    /// @param inputProof Input proof for encrypted vote
    function depositVote(externalEuint8 inputEuint8, bytes calldata inputProof) external votingActive {
        require(usdcToken != address(0), "Voting: USDC token not set");
        require(!hasVoted[msg.sender], "Voting: already voted");
        
        // Transfer exactly 10 USDC from user to contract
        require(
            IERC20(usdcToken).transferFrom(msg.sender, address(this), VOTE_DEPOSIT_AMOUNT),
            "Voting: USDC transfer failed"
        );
        
        // Calculate and transfer 2% fee to protocol treasury
        uint256 feeAmount = (VOTE_DEPOSIT_AMOUNT * FEE_PERCENTAGE) / 100;
        require(
            IERC20(usdcToken).transfer(protocolTreasury, feeAmount),
            "Voting: fee transfer failed"
        );
        
        // Update accounting
        totalFeesCollected += feeAmount;
        totalVotingUSDC += VOTE_DEPOSIT_AMOUNT - feeAmount;
        
        // Convert encrypted input to euint8 and store
        _userVotes[msg.sender] = FHE.fromExternal(inputEuint8, inputProof);
        
        // Increment vote counters using encrypted comparison
        _votesOptionA = FHE.add(
            _votesOptionA,
            FHE.select(FHE.eq(_userVotes[msg.sender], FHE.asEuint8(0)), FHE.asEuint64(1), FHE.asEuint64(0))
        );
        FHE.allowThis(_votesOptionA);
        
        _votesOptionB = FHE.add(
            _votesOptionB,
            FHE.select(FHE.eq(_userVotes[msg.sender], FHE.asEuint8(1)), FHE.asEuint64(1), FHE.asEuint64(0))
        );
        FHE.allowThis(_votesOptionB);
        
        _votesOptionC = FHE.add(
            _votesOptionC,
            FHE.select(FHE.eq(_userVotes[msg.sender], FHE.asEuint8(2)), FHE.asEuint64(1), FHE.asEuint64(0))
        );
        FHE.allowThis(_votesOptionC);
        
        // Mark as voted and set permissions (only contract can access)
        hasVoted[msg.sender] = true;
        FHE.allowThis(_userVotes[msg.sender]);
        // NOTE: We do NOT allow the user to decrypt their vote directly
        // They must use requestUserVoteDecryption() which uses the DecryptionOracle
        
        emit VoteDeposit(msg.sender, VOTE_DEPOSIT_AMOUNT - feeAmount, feeAmount, block.timestamp);
    }
    
    /// @notice Callback function called by DecryptionOracle with decrypted vote tallies
    /// @param requestId The request ID to verify this is the expected callback
    /// @param cleartexts ABI-encoded decrypted values (votesA, votesB, votesC)
    /// @param decryptionProof Proof from the oracle to verify the decryption
    /// @dev ✅ AUTOMATIC RESOLUTION: This callback automatically resolves voting (no owner needed)
    /// @dev Similar to Auction pattern: resolveAuctionCallback() - decrypts and resolves in one go
    function resolveVotingCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) public {
        require(requestId == _latestTallyRequestId, "Voting: invalid request ID");
        
        // Verify signatures from the oracle (like auction pattern)
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        // Decode the decrypted vote counts (like auction pattern)
        (uint64 _votesA, uint64 _votesB, uint64 _votesC) = abi.decode(cleartexts, (uint64, uint64, uint64));
        
        // Store decrypted values
        votesA = uint256(_votesA);
        votesB = uint256(_votesB);
        votesC = uint256(_votesC);
        
        resultsRevealed = true;
        
        emit VotingEnded(block.timestamp);
        emit ResultsRevealed(votesA, votesB, votesC);
        
        // ✅ AUTOMATICALLY RESOLVE VOTING IN THE CALLBACK (no manual intervention needed)
        _resolveVotingInternal();
    }
    
    /// @notice Get time remaining until voting ends
    function timeUntilVotingEnds() external view returns (uint256) {
        if (block.timestamp >= votingEndTime) {
            return 0;
        }
        return votingEndTime - block.timestamp;
    }
    
    /// @notice Request decryption of user's vote via DecryptionOracle
    /// @dev OPTIONAL: claimReward() automatically requests decryption if needed
    /// This standalone function exists for users who want to pre-decrypt before claiming
    function requestUserVoteDecryption() external votingEnded {
        require(hasVoted[msg.sender], "Voting: did not vote");
        require(!voteDecrypted[msg.sender], "Voting: vote already decrypted");
        require(_userVoteRequestId[msg.sender] == 0, "Voting: decryption already requested");
        
        // Prepare encrypted value to decrypt
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(_userVotes[msg.sender]);
        
        // Request decryption from oracle with callback
        uint256 requestId = FHE.requestDecryption(cts, this.userVoteDecryptionCallback.selector);
        _userVoteRequestId[msg.sender] = requestId;
        _requestIdToUser[requestId] = msg.sender;
        
        emit UserVoteDecryptionRequested(msg.sender, requestId);
    }
    
    /// @notice Callback function called by DecryptionOracle with decrypted user vote
    /// @param requestId The request ID to verify and find which user this is for
    /// @param cleartexts ABI-encoded decrypted vote value
    /// @param decryptionProof Proof from the oracle to verify the decryption
    function userVoteDecryptionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) public {
        // Find which user made this request
        address user = _requestIdToUser[requestId];
        require(user != address(0), "Voting: invalid request ID");
        require(_userVoteRequestId[user] == requestId, "Voting: request ID mismatch");
        
        // Verify signatures from the oracle
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        // Decode the decrypted vote
        (uint8 decryptedVote) = abi.decode(cleartexts, (uint8));
        require(decryptedVote <= 2, "Voting: invalid vote value");
        
        // Store the decrypted vote securely
        decryptedVotes[user] = decryptedVote;
        voteDecrypted[user] = true;
    }
    
    /// @notice Permissionless batch decrypt - anyone can help decrypt multiple user votes
    /// @param users Array of user addresses whose votes to decrypt
    /// @dev This is a public good - helps users avoid gas costs for individual decryption
    function batchRequestUserVoteDecryption(address[] calldata users) external votingEnded {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (hasVoted[user] && !voteDecrypted[user] && _userVoteRequestId[user] == 0) {
                bytes32[] memory cts = new bytes32[](1);
                cts[0] = FHE.toBytes32(_userVotes[user]);
                
                uint256 requestId = FHE.requestDecryption(cts, this.batchUserVoteCallback.selector);
                _userVoteRequestId[user] = requestId;
                _requestIdToUser[requestId] = user;
                
                emit UserVoteDecryptionRequested(user, requestId);
            }
        }
    }
    
    /// @notice Callback for batch user vote decryption
    function batchUserVoteCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) public {
        // Find which user made this request
        address user = _requestIdToUser[requestId];
        require(user != address(0), "Voting: invalid request ID");
        require(_userVoteRequestId[user] == requestId, "Voting: request ID mismatch");
        
        // Verify signatures from the oracle
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        // Decode the decrypted vote
        (uint8 decryptedVote) = abi.decode(cleartexts, (uint8));
        require(decryptedVote <= 2, "Voting: invalid vote value");
        
        // Store the decrypted vote securely
        decryptedVotes[user] = decryptedVote;
        voteDecrypted[user] = true;
    }
    
    /// @notice Internal function to resolve voting (called automatically by oracle callback)
    /// @dev Determines minority/middle/majority and distributes surplus to WheelPool
    function _resolveVotingInternal() internal {
        require(resultsRevealed, "Voting: results not revealed yet");
        require(!votingResolved, "Voting: already resolved");
        
        // Rank options and determine multipliers based on ties
        (minorityOption, middleOption, majorityOption) = _rankOptions(votesA, votesB, votesC);
        _setMultipliers(votesA, votesB, votesC);
        
        // Calculate payouts using multipliers (multipliers are in basis points, 100 = 1x)
        uint256 minorityCount = _getVoteCount(minorityOption);
        uint256 middleCount = _getVoteCount(middleOption);
        uint256 majorityCount = _getVoteCount(majorityOption);
        uint256 netDeposit = VOTE_DEPOSIT_AMOUNT - (VOTE_DEPOSIT_AMOUNT * FEE_PERCENTAGE) / 100;
        
        uint256 minorityPayout = (minorityCount * netDeposit * minorityMultiplier) / 100;
        uint256 middlePayout = (middleCount * netDeposit * middleMultiplier) / 100;
        uint256 majorityPayout = (majorityCount * netDeposit * majorityMultiplier) / 100;
        uint256 totalPayouts = minorityPayout + middlePayout + majorityPayout;
        
        // Calculate surplus and WheelPool amount (5% of surplus)
        // If payouts exceed collected USDC, there's no surplus
        uint256 wheelPoolAmount = 0;
        if (totalVotingUSDC > totalPayouts) {
            uint256 surplus = totalVotingUSDC - totalPayouts;
            wheelPoolAmount = (surplus * WHEEL_POOL_PERCENTAGE) / 100;
        }
        
        // Transfer to WheelPool
        if (wheelPoolAmount > 0) {
            bool wheelSuccess = IERC20(usdcToken).transfer(wheelPool, wheelPoolAmount);
            require(wheelSuccess, "Voting: wheelpool transfer failed");
            
            IWheelPool(wheelPool).recordDeposit(wheelPoolAmount);
        }
        
        votingResolved = true;
        
        emit VotingResolved(minorityOption, middleOption, majorityOption, wheelPoolAmount);
    }
    
    /// @notice Internal function to resolve voting (called automatically by oracle callback)
    /// @dev This is ONLY called from resolveVotingCallback - no manual resolution needed
    
    /// @notice Claim reward - automatically requests decryption if needed
    /// @dev ✅ ONE-STEP PROCESS: User only calls this once
    /// If vote not decrypted yet, this will request decryption and require second call
    /// If vote already decrypted, transfers reward immediately
    function claimReward() external {
        require(votingResolved, "Voting: not resolved yet");
        require(hasVoted[msg.sender], "Voting: did not vote");
        require(!hasClaimedReward[msg.sender], "Voting: reward already claimed");
        
        // If vote not decrypted yet, request decryption
        if (!voteDecrypted[msg.sender]) {
            // Only request if not already pending
            if (_userVoteRequestId[msg.sender] == 0) {
                bytes32[] memory cts = new bytes32[](1);
                cts[0] = FHE.toBytes32(_userVotes[msg.sender]);
                
                uint256 requestId = FHE.requestDecryption(cts, this.userVoteDecryptionCallback.selector);
                _userVoteRequestId[msg.sender] = requestId;
                _requestIdToUser[requestId] = msg.sender;
                
                emit UserVoteDecryptionRequested(msg.sender, requestId);
            }
            
            // Revert with helpful message
            revert("Voting: decryption requested - call claimReward again after oracle callback");
        }
        
        // Vote is decrypted, proceed with claim
        uint8 userVote = decryptedVotes[msg.sender];
        
        uint256 netDeposit = VOTE_DEPOSIT_AMOUNT - (VOTE_DEPOSIT_AMOUNT * FEE_PERCENTAGE) / 100;
        uint256 rewardAmount = 0;
        
        // Calculate reward based on multipliers
        if (userVote == minorityOption) {
            rewardAmount = (netDeposit * minorityMultiplier) / 100;
        } else if (userVote == middleOption) {
            rewardAmount = (netDeposit * middleMultiplier) / 100;
        } else if (userVote == majorityOption) {
            rewardAmount = (netDeposit * majorityMultiplier) / 100;
        }
        
        hasClaimedReward[msg.sender] = true;
        
        if (rewardAmount > 0) {
            bool success = IERC20(usdcToken).transfer(msg.sender, rewardAmount);
            require(success, "Voting: reward transfer failed");
        }
        
        emit RewardClaimed(msg.sender, userVote, rewardAmount);
    }
    
    // ============ Internal Helper Functions ============
    
    /// @notice Rank options by vote count (minority, middle, majority)
    function _rankOptions(uint256 a, uint256 b, uint256 c) 
        internal 
        pure 
        returns (uint8 minority, uint8 middle, uint8 majority) 
    {
        if (a <= b && a <= c) {
            minority = 0; // A is minority
            if (b <= c) {
                middle = 1; // B is middle
                majority = 2; // C is majority
            } else {
                middle = 2; // C is middle
                majority = 1; // B is majority
            }
        } else if (b <= a && b <= c) {
            minority = 1; // B is minority
            if (a <= c) {
                middle = 0; // A is middle
                majority = 2; // C is majority
            } else {
                middle = 2; // C is middle
                majority = 0; // A is majority
            }
        } else {
            minority = 2; // C is minority
            if (a <= b) {
                middle = 0; // A is middle
                majority = 1; // B is majority
            } else {
                middle = 1; // B is middle
                majority = 0; // A is majority
            }
        }
    }
    
    /// @notice Get vote count for a given option
    function _getVoteCount(uint8 option) internal view returns (uint256) {
        if (option == 0) return votesA;
        if (option == 1) return votesB;
        if (option == 2) return votesC;
        return 0;
    }
    
    /// @notice Set multipliers based on vote distribution (handles ties)
    /// @dev Two winners (tie for LEAST, e.g., 15-15-70): 1.5x each, majority (70) gets 0x
    /// @dev Two losers (tie for MOST, e.g., 70-70-15): minority (15) gets 2x, tied majorities get 0.5x each
    /// @dev Three-way tie (e.g., 1-1-1 or 33-33-33): everyone gets 1x (full refund)
    /// @dev No ties: minority 2x, middle 1x, majority 0x
    function _setMultipliers(uint256 a, uint256 b, uint256 c) internal {
        uint256 minVotes = _min3(a, b, c);
        uint256 maxVotes = _max3(a, b, c);
        
        // Count how many options have min votes and max votes
        uint256 minCount = 0;
        uint256 maxCount = 0;
        if (a == minVotes) minCount++;
        if (b == minVotes) minCount++;
        if (c == minVotes) minCount++;
        if (a == maxVotes) maxCount++;
        if (b == maxVotes) maxCount++;
        if (c == maxVotes) maxCount++;
        
        // Get actual vote counts for ranked options
        uint256 minorityVotes = _getVoteCount(minorityOption);
        uint256 middleVotes = _getVoteCount(middleOption);
        uint256 majorityVotes = _getVoteCount(majorityOption);
        
        // Scenario 1: Three-way tie (1-1-1, 33-33-33, etc.) - everyone gets refunded
        if (minVotes == maxVotes) {
            minorityMultiplier = 100; // 1x refund
            middleMultiplier = 100;   // 1x refund
            majorityMultiplier = 100; // 1x refund
        }
        // Scenario 2: Two winners tied for LOWEST votes (15-15-70)
        // The two minorities win 1.5x each, the majority (70) loses (0x)
        else if (minCount == 2 && minVotes != maxVotes) {
            if (minorityVotes == middleVotes) {
                // Minority and Middle tied for lowest (winners)
                minorityMultiplier = 150; // Winner gets 1.5x
                middleMultiplier = 150;   // Winner gets 1.5x
                majorityMultiplier = 0;   // Loser gets 0x
            }
        }
        // Scenario 3: Two losers tied for HIGHEST votes (70-70-15)
        // The minority wins 2x, the two majorities lose but get partial refund (0.5x each)
        else if (maxCount == 2 && minVotes != maxVotes) {
            if (majorityVotes == middleVotes) {
                // Middle and Majority tied for highest (losers)
                minorityMultiplier = 200; // Winner gets 2x
                middleMultiplier = 50;    // Tied loser gets 0.5x
                majorityMultiplier = 50;  // Tied loser gets 0.5x
            }
        }
        // Scenario 4: No ties - standard distribution
        else {
            // Standard: minority 2x, middle 1x, majority 0x
            minorityMultiplier = 200; // 2x
            middleMultiplier = 100;   // 1x (refund)
            majorityMultiplier = 0;   // 0x (loses)
        }
    }
    
    /// @notice Helper to find minimum of three numbers
    function _min3(uint256 a, uint256 b, uint256 c) internal pure returns (uint256) {
        if (a <= b && a <= c) return a;
        if (b <= c) return b;
        return c;
    }
    
    /// @notice Helper to find maximum of three numbers
    function _max3(uint256 a, uint256 b, uint256 c) internal pure returns (uint256) {
        if (a >= b && a >= c) return a;
        if (b >= c) return b;
        return c;
    }
    
    // ============ Chainlink Automation Functions ============
    
    /// @notice Check if upkeep is needed (called by Chainlink Keepers off-chain)
    /// @dev Returns true when voting has ended and results haven't been revealed yet
    /// @return upkeepNeeded True if reveal should be triggered
    /// @return performData Unused, returns empty bytes
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // Upkeep is needed when:
        // 1. Voting period has ended (timestamp >= votingEndTime)
        // 2. Results not yet revealed
        // 3. Auto-reveal not already triggered
        // 4. USDC token is set (voting is properly configured)
        upkeepNeeded = (
            block.timestamp >= votingEndTime &&
            !resultsRevealed &&
            !autoRevealTriggered &&
            usdcToken != address(0)
        );
        
        // We don't use performData in this implementation
        performData = "";
    }
    
    /// @notice Perform upkeep (called automatically by Chainlink when checkUpkeep returns true)
    /// @dev ✅ FULLY AUTOMATIC: Chainlink triggers decryption, oracle resolves everything
    /// No manual intervention required - fully autonomous voting system
    function performUpkeep(bytes calldata /* performData */) external override {
        // Re-verify conditions for security (prevent unauthorized calls)
        require(block.timestamp >= votingEndTime, "Voting: voting still active");
        require(!resultsRevealed, "Voting: results already revealed");
        require(!autoRevealTriggered, "Voting: auto-reveal already triggered");
        require(usdcToken != address(0), "Voting: USDC not set");
        require(_latestTallyRequestId == 0, "Voting: decryption already requested");
        
        // Mark as triggered to prevent duplicate calls
        autoRevealTriggered = true;
        
        // ✅ AUTOMATICALLY REQUEST DECRYPTION (like Zama auction example)
        // Prepare array of encrypted values to decrypt
        bytes32[] memory cts = new bytes32[](3);
        cts[0] = FHE.toBytes32(_votesOptionA);
        cts[1] = FHE.toBytes32(_votesOptionB);
        cts[2] = FHE.toBytes32(_votesOptionC);
        
        // Request decryption from oracle - callback will auto-resolve voting
        _latestTallyRequestId = FHE.requestDecryption(cts, this.resolveVotingCallback.selector);
        
        emit ReadyToReveal(block.timestamp);
        emit TallyDecryptionRequested(_latestTallyRequestId);
    }
}