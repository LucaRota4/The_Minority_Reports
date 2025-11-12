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

## 📊 Test Statistics

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
**Automation**: @chainlink/contracts</content>
<parameter name="filePath">/Users/eliomargiotta/Documents/code/Zama/Zama-Vault/test/test.md