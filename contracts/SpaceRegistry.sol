// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IENS {
    function owner(bytes32 node) external view returns (address);
}

contract SpaceRegistry {
    IENS public ens;

    struct Space {
        bytes32 spaceId;
        string ensName;
        string displayName;
        address owner;
        uint256 createdAt;
        bool active;
    }

    // State
    mapping(bytes32 => Space) public spaces;
    mapping(address => bytes32[]) public ownerSpaces;
    mapping(bytes32 => bool) public spaceExists;

    // Events
    event SpaceCreated(bytes32 indexed spaceId, string ensName, string displayName, address indexed owner);
    event SpaceTransferred(bytes32 indexed spaceId, address indexed previousOwner, address indexed newOwner);
    event SpaceDeactivated(bytes32 indexed spaceId);
    event SpaceDisplayNameUpdated(bytes32 indexed spaceId, string newDisplayName, address indexed updatedBy);

    // Errors
    error SpaceAlreadyExists();
    error SpaceDoesNotExist();
    error NotSpaceOwner();
    error InvalidENSName();
    error NotENSOwner();
    error ZeroAddress();
    error InvalidDisplayName();

    constructor(address _ensRegistry) {
        ens = IENS(_ensRegistry);
    }

    /**
     * @notice Create a new space with an ENS name that you own
     * @param ensName The ENS name for the space (must end with .eth and you must own it)
     * @param displayName Display name for the space (max 30 characters)
     */
    function createSpace(string calldata ensName, string calldata displayName) external {
        // Validate ENS name format (ends with .eth)
        if (!isValidENSName(ensName)) revert InvalidENSName();
        
        // Validate display name length
        if (bytes(displayName).length > 30) revert InvalidDisplayName();

        // Compute namehash and check ENS ownership
        bytes32 node = namehash(ensName);
        if (ens.owner(node) != msg.sender) revert NotENSOwner();

        // Compute spaceId from ENS name
        bytes32 spaceId = keccak256(abi.encodePacked(ensName));

        if (spaceExists[spaceId]) revert SpaceAlreadyExists();

        spaces[spaceId] = Space({
            spaceId: spaceId,
            ensName: ensName,
            displayName: displayName,
            owner: msg.sender,
            createdAt: block.timestamp,
            active: true
        });

        spaceExists[spaceId] = true;
        ownerSpaces[msg.sender].push(spaceId);

        emit SpaceCreated(spaceId, ensName, displayName, msg.sender);
    }

    /**
     * @notice Transfer space ownership
     * @param spaceId The space to transfer
     * @param newOwner The new owner address
     */
    function transferSpaceOwnership(bytes32 spaceId, address newOwner) external {
        if (!spaceExists[spaceId]) revert SpaceDoesNotExist();
        if (spaces[spaceId].owner != msg.sender) revert NotSpaceOwner();
        if (newOwner == address(0)) revert ZeroAddress();

        address previousOwner = spaces[spaceId].owner;
        spaces[spaceId].owner = newOwner;

        // Update ownerSpaces mappings
        _removeFromOwnerSpaces(previousOwner, spaceId);
        ownerSpaces[newOwner].push(spaceId);

        emit SpaceTransferred(spaceId, previousOwner, newOwner);
    }

    /**
     * @notice Deactivate a space (only owner)
     * @param spaceId The space to deactivate
     */
    function deactivateSpace(bytes32 spaceId) external {
        if (!spaceExists[spaceId]) revert SpaceDoesNotExist();
        if (spaces[spaceId].owner != msg.sender) revert NotSpaceOwner();

        spaces[spaceId].active = false;
        emit SpaceDeactivated(spaceId);
    }

    /**
     * @notice Update space display name
     * @param spaceId The space to update
     * @param newDisplayName New display name (max 30 characters)
     */
    function updateSpaceDisplayName(bytes32 spaceId, string calldata newDisplayName) external {
        if (!spaceExists[spaceId]) revert SpaceDoesNotExist();
        if (spaces[spaceId].owner != msg.sender) revert NotSpaceOwner();
        if (bytes(newDisplayName).length > 30) revert InvalidDisplayName();

        spaces[spaceId].displayName = newDisplayName;
        
        emit SpaceDisplayNameUpdated(spaceId, newDisplayName, msg.sender);
    }

    /**
     * @notice Check if an address is the owner of a space
     * @param spaceId The space to check
     * @param account The address to check
     * @return True if the account owns the space
     */
    function isSpaceOwner(bytes32 spaceId, address account) external view returns (bool) {
        return spaceExists[spaceId] && spaces[spaceId].owner == account && spaces[spaceId].active;
    }

    /**
     * @notice Check if a space exists and is active
     * @param spaceId The space to check
     * @return True if the space exists and is active
     */
    function spaceIsActive(bytes32 spaceId) external view returns (bool) {
        return spaceExists[spaceId] && spaces[spaceId].active;
    }

    /**
     * @notice Get spaces owned by an address
     * @param owner The owner address
     * @return Array of space IDs owned by the address
     */
    function getOwnerSpaces(address owner) external view returns (bytes32[] memory) {
        return ownerSpaces[owner];
    }

    /**
     * @notice Get space information
     * @param spaceId The space ID
     * @return ensName The ENS name
     * @return displayName The display name
     * @return owner Owner address
     * @return createdAt Creation timestamp
     * @return active Whether the space is active
     */
    function getSpace(bytes32 spaceId) external view returns (
        string memory ensName,
        string memory displayName,
        address owner,
        uint256 createdAt,
        bool active
    ) {
        Space memory space = spaces[spaceId];
        return (space.ensName, space.displayName, space.owner, space.createdAt, space.active);
    }

    /**
     * @notice Internal function to remove space from owner's list
     * @param owner The owner address
     * @param spaceId The space to remove
     */
    function _removeFromOwnerSpaces(address owner, bytes32 spaceId) internal {
        bytes32[] storage ownerSpacesList = ownerSpaces[owner];
        for (uint256 i = 0; i < ownerSpacesList.length; i++) {
            if (ownerSpacesList[i] == spaceId) {
                ownerSpacesList[i] = ownerSpacesList[ownerSpacesList.length - 1];
                ownerSpacesList.pop();
                break;
            }
        }
    }

    /**
     * @notice Check if a string is a valid ENS name (ends with .eth)
     * @param name The name to validate
     * @return True if valid ENS name
     */
    function isValidENSName(string memory name) internal pure returns (bool) {
        bytes memory nameBytes = bytes(name);
        uint256 length = nameBytes.length;
        
        // Must be at least ".eth" length and end with ".eth"
        if (length < 4) return false;
        
        // Check last 4 characters are ".eth"
        return nameBytes[length - 4] == '.' &&
               nameBytes[length - 3] == 'e' &&
               nameBytes[length - 2] == 't' &&
               nameBytes[length - 1] == 'h';
    }

    /**
     * @notice Calculate the namehash of a given ENS name
     * @param name The ENS name to hash
     * @return The computed namehash
     */
    function namehash(string memory name) public pure returns (bytes32) {
        bytes memory nameBytes = bytes(name);
        bytes32 hash = 0x0000000000000000000000000000000000000000000000000000000000000000;
        
        // Split by '.' and process from right to left (TLD first)
        uint256[] memory labelStarts = new uint256[](10); // Max 10 labels
        uint256 labelCount = 0;
        uint256 start = 0;
        
        for (uint256 i = 0; i <= nameBytes.length; i++) {
            if (i == nameBytes.length || nameBytes[i] == '.') {
                labelStarts[labelCount++] = start;
                start = i + 1;
            }
        }
        
        // Process labels from right to left
        for (uint256 i = labelCount; i > 0; i--) {
            uint256 labelStart = labelStarts[i - 1];
            uint256 labelEnd = (i == labelCount) ? nameBytes.length : labelStarts[i] - 1;
            uint256 labelLength = labelEnd - labelStart;
            
            bytes memory label = new bytes(labelLength);
            for (uint256 j = 0; j < labelLength; j++) {
                label[j] = nameBytes[labelStart + j];
            }
            
            hash = keccak256(abi.encodePacked(hash, keccak256(label)));
        }
        
        return hash;
    }
}