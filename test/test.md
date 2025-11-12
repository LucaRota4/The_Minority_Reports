# Zama-Vault: Private Proposal System with FHE

## 📋 Overview

Zama-Vault is a decentralized proposal voting system that leverages **Fully Homomorphic Encryption (FHE)** to ensure complete privacy of votes until proposal resolution. The system uses a factory pattern with Chainlink automation for decentralized proposal management.

## 🏗️ Contract Architecture

### Core Contracts

#### 1. `IProposalFactory.sol` - Factory Interface
**Purpose**: Standard interface for proposal factory contracts
**Key Features**:
- `ProposalCreated` event for indexing proposal creation
- `createProposal()` function returning `(address proposal, bytes32 proposalId)`
- Shared enums and structs for consistency

#### 2. `IPrivateProposal.sol` - Proposal Interface
**Purpose**: Standard interface for individual proposal contracts
**Key Features**:
- Complete view functions for proposal metadata and status
- Voting functions with FHE support
- Resolution and upkeep functions
- Standardized access to all proposal data

#### 3. `PrivateProposal.sol` - Proposal Implementation
**Purpose**: Individual proposal contract with encrypted voting
**Key Features**:
- **FHE-Powered Voting**: Votes are encrypted using Zama's FHE library
- **Encrypted Vote Storage**: `euint8` for choice indices, `euint64[]` for vote counts
- **Chainlink Integration**: Automated resolution via upkeep calls
- **Factory Communication**: Notifies factory of user votes (optional tracking)

**Core Functions**:
- `vote(externalEuint8, bytes)` - Encrypted vote submission
- `performUpkeep(bytes)` - Chainlink-triggered resolution
- `resolveProposalCallback(uint256, bytes, bytes)` - Decryption callback

#### 4. `PrivateProposalFactory.sol` - Factory Implementation
**Purpose**: Creates and manages multiple proposal instances
**Key Features**:
- **Whitelist Management**: Controls who can create proposals
- **Proposal Creation**: Deploys new `PrivateProposal` contracts
- **Chainlink Automation**: Monitors all proposals for resolution needs
- **User Vote Tracking**: Records voting history (optional feature)

**Core Functions**:
- `createProposal(CreateProposalParams)` - Deploy new proposal
- `checkUpkeep(bytes)` - Check if proposals need resolution
- `performUpkeep(bytes)` - Execute resolution for ended proposals
- `updateWhitelist(address, bool)` - Manage creation permissions

## 🧪 Test Coverage

### Test Suites Overview

#### `PrivateProposal.ts` - Individual Proposal Tests (23 tests)
**Focus**: Core voting functionality and proposal lifecycle

**Test Categories**:
1. **Deployment** (1 test)
   - Correct parameter initialization

2. **Voting** (4 tests)
   - Encrypted vote submission
   - Double-vote prevention
   - Timing restrictions (before/after voting period)

3. **Resolution and Upkeep** (4 tests)
   - Chainlink upkeep triggering
   - Vote decryption and tallying
   - Majority winner determination
   - Quorum validation

4. **Factory Management** (9 tests)
   - Owner/whitelisted user creation permissions
   - Whitelist management (add/remove/batch)
   - Proposal cancellation (pre/post start)
   - Access control validation

5. **Edge Cases and Error Handling** (5 tests)
   - Invalid parameters (choice count, timing)
   - Duplicate proposal prevention
   - Callback data validation
   - Multiple upkeep prevention

#### `PrivateProposalFactory.ts` - Factory Tests (30 tests)
**Focus**: Factory operations and multi-proposal management

**Test Categories**:
1. **Deployment** (1 test)
   - Initial state validation

2. **Whitelist Management** (6 tests)
   - Owner permissions for whitelist operations
   - Batch updates
   - Zero address rejection
   - Access control

3. **Proposal Creation** (7 tests)
   - Parameter validation (empty names, duplicates, length limits)
   - Permission checks (owner vs whitelisted vs non-whitelisted)
   - Storage and indexing

4. **Proposal Cancellation** (3 tests)
   - Pre-start cancellation permissions
   - Post-start cancellation prevention
   - Creator/owner access control

5. **View Functions** (6 tests)
   - Voting count accuracy
   - Filtering (upcoming/active/ended)
   - User voting history (currently empty)

6. **Chainlink Automation** (4 tests)
   - Upkeep detection for ended proposals
   - Multi-proposal batch processing
   - Upkeep state management

7. **Ownership** (3 tests)
   - Ownership transfer functionality
   - Access control validation
   - Zero address rejection

## 🔑 Key Features Tested

### Fully Homomorphic Encryption (FHE)
- ✅ Encrypted vote submission using `externalEuint8`
- ✅ Encrypted vote storage and tallying
- ✅ Automated decryption via Chainlink callbacks
- ✅ Privacy preservation until resolution

### Factory Pattern
- ✅ Standardized proposal creation interface
- ✅ Whitelist-based access control
- ✅ Multi-proposal management
- ✅ Automated lifecycle monitoring

### Chainlink Automation
- ✅ Upkeep detection for ended proposals
- ✅ Decentralized resolution triggering
- ✅ Batch processing of multiple proposals
- ✅ Gas-efficient monitoring

### Governance Features
- ✅ Configurable quorum and threshold rules
- ✅ Multiple voting types (SingleChoice, etc.)
- ✅ Abstain vote handling
- ✅ Time-based proposal lifecycle

### Security & Access Control
- ✅ Owner-only whitelist management
- ✅ Creator/owner cancellation permissions
- ✅ Double-vote prevention
- ✅ Timing-based access control

## � Access Control & Permission System

### Proposal Creation Permissions
**Who CAN create proposals:**
- ✅ **Factory Owner**: Always has permission (automatically whitelisted on deployment)
- ✅ **Whitelisted Users**: Addresses explicitly added to whitelist by owner

**Who CANNOT create proposals:**
- ❌ **Non-whitelisted addresses**: Regular users without whitelist approval
- ❌ **Zero address**: Invalid address rejection

**Whitelist Management:**
- **Owner-only functions**: `updateWhitelist()`, `batchUpdateWhitelist()`
- **Automatic owner whitelisting**: Owner is whitelisted during factory deployment
- **Batch operations**: Support for adding/removing multiple users at once

### Voting Permissions
**Who CAN vote:**
- ✅ **Anyone**: No restrictions - any address can vote on active proposals
- ✅ **One vote per address**: Double-vote prevention enforced

**Voting Restrictions:**
- ❌ **Cannot vote before start time**: `block.timestamp >= start`
- ❌ **Cannot vote after end time**: `block.timestamp < end`
- ❌ **Cannot vote twice**: `hasVoted[msg.sender]` prevents duplicate votes
- ❌ **Cannot vote on resolved proposals**: `proposalActive` modifier

## 🎯 Voting Eligibility Extensions

### Current System: Open Voting
The current implementation allows **any address** to vote on active proposals, making it a fully open and permissionless voting system. This design prioritizes accessibility and decentralization.

### Potential Voting Restrictions (Extensible)
The system can be easily extended to implement various voting eligibility criteria:

#### 1. **NFT Ownership Requirements**
```solidity
// Example: Require specific NFT ownership
modifier onlyNFTOwner(address nftContract, uint256 tokenId) {
    require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not NFT owner");
    _;
}

// Usage in vote function:
function vote(externalEuint8 inputEuint8, bytes calldata inputProof) 
    external 
    proposalActive 
    onlyNFTOwner(requiredNFT, requiredTokenId)
{
    // ... existing vote logic
}
```

#### 2. **Token Balance Requirements**
```solidity
// Example: Require minimum token balance
modifier minimumBalance(address tokenContract, uint256 minBalance) {
    require(IERC20(tokenContract).balanceOf(msg.sender) >= minBalance, "Insufficient balance");
    _;
}

// Usage in vote function:
function vote(externalEuint8 inputEuint8, bytes calldata inputProof) 
    external 
    proposalActive 
    minimumBalance(governanceToken, 100 * 10**18)
{
    // ... existing vote logic
}
```

#### 3. **Voting Whitelist**
```solidity
// Add voting whitelist to proposal parameters
struct CreateProposalParams {
    // ... existing fields
    address[] votingWhitelist;  // Empty array = open voting
    bool whitelistOnly;
}

// Check in vote function:
function vote(externalEuint8 inputEuint8, bytes calldata inputProof) external proposalActive {
    if (votingWhitelist.length > 0) {
        bool isAllowed = false;
        for (uint256 i = 0; i < votingWhitelist.length; i++) {
            if (votingWhitelist[i] == msg.sender) {
                isAllowed = true;
                break;
            }
        }
        require(isAllowed, "Not on voting whitelist");
    }
    // ... existing vote logic
}
```

#### 4. **Merkle Tree Proofs**
```solidity
// Gas-efficient whitelist using Merkle proofs
bytes32 public votingMerkleRoot;

function voteWithProof(
    externalEuint8 inputEuint8, 
    bytes calldata inputProof,
    bytes32[] calldata merkleProof
) external proposalActive {
    bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
    require(MerkleProof.verify(merkleProof, votingMerkleRoot, leaf), "Invalid proof");
    // ... existing vote logic
}
```

#### 5. **Custom Eligibility Contracts**
```solidity
// Interface for custom eligibility logic
interface IVotingEligibility {
    function canVote(address voter, bytes calldata proposalData) external view returns (bool);
}

// Usage:
IVotingEligibility public eligibilityChecker;

modifier eligibleToVote() {
    if (address(eligibilityChecker) != address(0)) {
        require(eligibilityChecker.canVote(msg.sender, abi.encode(spaceId, title)), "Not eligible to vote");
    }
    _;
}
```

### Implementation Considerations

#### **Gas Costs**
- NFT ownership checks: ~2,600 gas
- Token balance checks: ~2,300 gas  
- Merkle proofs: ~300 gas per proof level
- Whitelist iteration: O(n) - consider Merkle trees for large lists

#### **Privacy Trade-offs**
- Balance/NFT checks reveal voter eligibility publicly
- Consider privacy-preserving alternatives for sensitive criteria
- FHE could potentially be used for private eligibility checks

#### **Flexibility Options**
- **Proposal-level**: Different restrictions per proposal
- **Factory-level**: Global restrictions across all proposals
- **Dynamic**: Eligibility that changes over time
- **Compound**: Multiple criteria (AND/OR logic)

### Recommended Implementation Pattern

```solidity
// Add to CreateProposalParams
struct VotingCriteria {
    uint8 criteriaType;  // 0=open, 1=NFT, 2=token, 3=whitelist, 4=merkle
    address criteriaContract;
    uint256 criteriaValue;  // tokenId, minBalance, etc.
    bytes32 merkleRoot;     // For merkle-based whitelists
}

struct CreateProposalParams {
    // ... existing fields
    VotingCriteria votingCriteria;
}

// Modifier in PrivateProposal
modifier eligibleToVote() {
    if (votingCriteria.criteriaType == 1) { // NFT
        require(IERC721(votingCriteria.criteriaContract).ownerOf(votingCriteria.criteriaValue) == msg.sender);
    } else if (votingCriteria.criteriaType == 2) { // Token balance
        require(IERC20(votingCriteria.criteriaContract).balanceOf(msg.sender) >= votingCriteria.criteriaValue);
    }
    // ... other criteria types
    _;
}
```

### Security Considerations
- **Front-running**: Public eligibility checks can enable MEV
- **Oracle dependencies**: External contract calls add failure points
- **Upgradeability**: Consider proxy patterns for evolving criteria
- **Gas limits**: Complex checks may hit block gas limits

### Future Extensions
- **Quadratic voting**: Balance-based voting power
- **Delegation**: Vote delegation systems
- **Reputation-based**: On-chain reputation scores
- **Cross-chain**: Multi-chain eligibility verification

### Proposal Management Permissions
**Cancellation Rights:**
- ✅ **Proposal Creator**: Can cancel their own proposal before it starts
- ✅ **Factory Owner**: Can cancel any proposal before it starts
- ❌ **Others**: Non-creators and non-owners cannot cancel proposals

**Ownership Transfer:**
- ✅ **Current Owner Only**: `transferOwnership()` restricted to owner
- ❌ **Zero Address**: Cannot transfer ownership to zero address

### Chainlink Automation Permissions
**Upkeep Execution:**
- ✅ **Anyone**: Chainlink nodes can call `performUpkeep()` when conditions are met
- ✅ **Automated Resolution**: Decentralized proposal resolution
- ✅ **Batch Processing**: Multiple proposals can be resolved in one upkeep call

### Factory Administration
**Owner-Only Functions:**
- `updateWhitelist(address, bool)` - Add/remove individual users
- `batchUpdateWhitelist(address[], bool)` - Batch whitelist operations
- `transferOwnership(address)` - Transfer factory ownership
- `cancelProposal(address)` - Cancel proposals before start (also allowed for creators)

**Permission Hierarchy:**
1. **Factory Owner** (highest privilege)
   - All administrative functions
   - Can create proposals (auto-whitelisted)
   - Can cancel any proposal before start
   
2. **Whitelisted Users**
   - Can create proposals
   - Can cancel their own proposals before start
   
3. **Regular Users**
   - Can vote on any active proposal (one vote per proposal)
   - Cannot create or manage proposals

## �📊 Test Statistics

- **Total Tests**: 53 passing
- **PrivateProposal**: 23 tests (43% of total)
- **PrivateProposalFactory**: 30 tests (57% of total)
- **Coverage Areas**: Deployment, Voting, Resolution, Management, Edge Cases
- **FHE Integration**: Fully tested with mock environment
- **Chainlink Integration**: Complete automation testing

## 🔧 Development Notes

### FHEVM Environment
- Tests run against FHEVM mock environment (`hre.fhevm.isMock`)
- Production deployment requires Zama FHEVM mainnet/testnet

### Chainlink Configuration
- Uses `AutomationCompatibleInterface` for upkeep
- `checkUpkeep()` identifies proposals needing resolution
- `performUpkeep()` executes decryption requests

### Gas Optimization
- Custom errors instead of require strings
- Efficient encrypted vote tallying
- Batch processing for multiple proposals

## 🚀 Usage Flow

1. **Factory Deployment**: Deploy `PrivateProposalFactory`
2. **Whitelist Setup**: Owner adds authorized proposal creators
3. **Proposal Creation**: Whitelisted users create proposals with FHE config
4. **Voting Period**: Users submit encrypted votes via `vote()`
5. **Automated Resolution**: Chainlink triggers `performUpkeep()` when voting ends
6. **Decryption**: Oracle decrypts votes and calls `resolveProposalCallback()`
7. **Results**: Proposal resolved with winner and final tallies

## 📈 Future Extensions

- Multiple proposal types (Approval, Quadratic, Ranked)
- Custom threshold modes
- Proposal templates
- Cross-chain voting
- Enhanced privacy features

---

**Test Environment**: Hardhat + FHEVM Mock  
**Solidity Version**: ^0.8.24  
**FHE Library**: @fhevm/solidity  
**Automation**: @chainlink/contracts