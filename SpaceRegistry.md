# SpaceRegistry Contract

## Overview

The `SpaceRegistry` contract implements a decentralized registry for governance spaces backed by ENS (Ethereum Name Service) domain ownership. It allows users to create and manage governance spaces where ownership is verified through ENS domain control, providing a trustless way to establish space authority.

## Features

### ✅ ENS Ownership Verification
- Spaces can only be created by owners of valid ENS domains
- Supports `.eth` domains with proper namehash calculation
- Real-time ownership verification through ENS registry

### ✅ Separated Identity Fields
- **ENS Name**: Used for ownership verification and unique identification
- **Display Name**: User-friendly name for UI display (max 30 characters)
- Allows spaces to have readable names while maintaining cryptographic ownership verification

### ✅ Event-Driven Architecture
- Comprehensive event logging for frontend integration
- Tracks space creation, ownership transfers, deactivation, and display name updates
- Enables real-time dashboard updates

### ✅ Security & Access Control
- Only ENS domain owners can create spaces
- Only space owners can modify their spaces
- Comprehensive error handling with custom error types

## Architecture

### Data Structures

```solidity
struct Space {
    bytes32 spaceId;        // Unique identifier derived from ENS name
    string ensName;         // ENS domain name (e.g., "myspace.eth")
    string displayName;     // User-friendly display name (max 30 chars)
    address owner;          // Current owner address
    uint256 createdAt;      // Creation timestamp
    bool active;           // Active status
}
```

### State Variables

```solidity
mapping(bytes32 => Space) public spaces;           // Space data storage
mapping(address => bytes32[]) public ownerSpaces;  // Owner's space list
mapping(bytes32 => bool) public spaceExists;       // Existence tracking
IENS public ens;                                   // ENS registry interface
```

## Functions

### Core Functions

#### `createSpace(string ensName, string displayName)`
Creates a new governance space with ENS ownership verification.

**Requirements:**
- `ensName` must end with `.eth`
- Caller must own the ENS domain
- `displayName` ≤ 30 characters
- Space doesn't already exist

**Events:** Emits `SpaceCreated(spaceId, ensName, displayName, owner)`

#### `transferSpaceOwnership(bytes32 spaceId, address newOwner)`
Transfers ownership of a space to a new address.

**Requirements:**
- Space must exist and be active
- Caller must be current owner
- `newOwner` ≠ address(0)

**Events:** Emits `SpaceTransferred(spaceId, previousOwner, newOwner)`

#### `deactivateSpace(bytes32 spaceId)`
Deactivates a space (soft delete).

**Requirements:**
- Space must exist
- Caller must be owner

**Events:** Emits `SpaceDeactivated(spaceId)`

#### `updateSpaceDisplayName(bytes32 spaceId, string newDisplayName)`
Updates the display name of a space.

**Requirements:**
- Space must exist
- Caller must be owner
- `newDisplayName` ≤ 30 characters

**Events:** Emits `SpaceDisplayNameUpdated(spaceId, newDisplayName, updatedBy)`

### View Functions

#### `getSpace(bytes32 spaceId)`
Returns complete space information.

**Returns:** `(ensName, displayName, owner, createdAt, active)`

#### `getOwnerSpaces(address owner)`
Returns all space IDs owned by an address.

**Returns:** `bytes32[]` array of space IDs

#### `isSpaceOwner(bytes32 spaceId, address account)`
Checks if an address owns a specific space.

**Returns:** `bool` - true if account owns the active space

#### `spaceIsActive(bytes32 spaceId)`
Checks if a space exists and is active.

**Returns:** `bool` - true if space exists and is active

### Utility Functions

#### `namehash(string name)`
Computes the ENS namehash for a given domain name.

**Algorithm:** Implements proper ENS namehash (right-to-left label processing)

#### `isValidENSName(string name)` - Internal
Validates that a string is a valid ENS name (ends with `.eth`).

## Events

### `SpaceCreated(bytes32 indexed spaceId, string ensName, string displayName, address indexed owner)`
Emitted when a new space is created.

### `SpaceTransferred(bytes32 indexed spaceId, address indexed previousOwner, address indexed newOwner)`
Emitted when space ownership is transferred.

### `SpaceDeactivated(bytes32 indexed spaceId)`
Emitted when a space is deactivated.

### `SpaceDisplayNameUpdated(bytes32 indexed spaceId, string newDisplayName, address indexed updatedBy)`
Emitted when a space's display name is updated.

## Error Handling

### Custom Errors

- `SpaceAlreadyExists()` - Attempted to create duplicate space
- `SpaceDoesNotExist()` - Referenced non-existent space
- `NotSpaceOwner()` - Unauthorized space modification attempt
- `InvalidENSName()` - Invalid ENS domain format
- `NotENSOwner()` - ENS domain not owned by caller
- `ZeroAddress()` - Attempted to use zero address
- `InvalidDisplayName()` - Display name too long (>30 characters)

## Testing Coverage

### Test Suite Overview
Comprehensive test suite with **26 passing tests** covering all functionality and edge cases.

### Test Categories

#### Space Creation Tests (5 tests)
- ✅ Valid space creation with ENS ownership
- ✅ Duplicate space prevention
- ✅ ENS name format validation
- ✅ Display name length validation
- ✅ ENS ownership requirement

#### Ownership Management Tests (4 tests)
- ✅ Ownership transfer functionality
- ✅ Non-existent space handling
- ✅ Unauthorized transfer prevention
- ✅ Zero address rejection

#### Space Management Tests (3 tests)
- ✅ Space deactivation
- ✅ Non-existent space handling
- ✅ Unauthorized deactivation prevention

#### Permission Checks Tests (4 tests)
- ✅ Owner verification for active spaces
- ✅ Non-owner rejection
- ✅ Inactive space handling
- ✅ Non-existent space handling

#### Status Checks Tests (3 tests)
- ✅ Active space verification
- ✅ Inactive space detection
- ✅ Non-existent space handling

#### Data Retrieval Tests (3 tests)
- ✅ Owner space listing
- ✅ Empty owner handling
- ✅ Complete space data retrieval

#### Display Name Management Tests (3 tests)
- ✅ Display name updates with events
- ✅ Unauthorized update prevention
- ✅ Length limit enforcement

#### Utility Tests (1 test)
- ✅ Namehash algorithm correctness

### Testing Infrastructure

#### MockENS Contract
- Simulates ENS registry for testing
- Allows setting node ownership for test scenarios
- Enables isolated testing without mainnet dependencies

#### Test Setup
- Uses Hardhat + ethers v6
- Comprehensive beforeEach setup with ENS ownership mocking
- Event emission verification
- Custom error validation

## Usage Examples

### Creating a Space
```solidity
// User owns "myspace.eth" ENS domain
spaceRegistry.createSpace("myspace.eth", "My Governance Space");
```

### Updating Display Name
```solidity
bytes32 spaceId = keccak256(abi.encodePacked("myspace.eth"));
spaceRegistry.updateSpaceDisplayName(spaceId, "Updated Space Name");
```

### Checking Space Information
```solidity
bytes32 spaceId = keccak256(abi.encodePacked("myspace.eth"));
(string ensName, string displayName, address owner, uint256 createdAt, bool active) = spaceRegistry.getSpace(spaceId);
```

### Frontend Integration
```javascript
// Listen for space creation events
spaceRegistry.on("SpaceCreated", (spaceId, ensName, displayName, owner) => {
    // Update dashboard with new space
});

// Listen for display name updates
spaceRegistry.on("SpaceDisplayNameUpdated", (spaceId, newDisplayName, updatedBy) => {
    // Update space display name in UI
});
```

## Deployment

### Constructor Parameters
- `ensRegistry`: Address of the ENS registry contract

### Network Support
- Designed for Ethereum mainnet and testnets
- Compatible with any network running ENS

### Dependencies
- ENS Registry contract
- Solidity ^0.8.24

## Security Considerations

### ENS Integration
- Relies on ENS registry for ownership verification
- Namehash implementation follows ENS specification
- Protected against domain squatting through ownership requirements

### Access Control
- Multi-level permission checks
- Owner-only operations protected
- Zero address validations

### Input Validation
- ENS name format verification
- Display name length limits
- Comprehensive error messages

## Future Enhancements

### Potential Features
- Space metadata storage
- Voting integration
- Multi-signature ownership
- Space delegation
- ENS subdomain support

### Protocol Extensions
- Integration with governance protocols
- Cross-chain space verification
- Enhanced metadata standards

---

*This contract provides a solid foundation for decentralized governance spaces with ENS-backed identity verification.*