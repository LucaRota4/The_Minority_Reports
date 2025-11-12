// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IProposalFactory.sol";

/// @title Private Proposal Interface
/// @notice Standard interface for private proposal contracts
interface IPrivateProposal {
    // ============ View Functions ============

    /// @notice Get proposal metadata
    function spaceId() external view returns (bytes32);
    function title() external view returns (string memory);
    function bodyURI() external view returns (string memory);
    function discussionURI() external view returns (string memory);
    function app() external view returns (string memory);

    /// @notice Get proposal configuration
    function pType() external view returns (ProposalType);
    function choices(uint256 index) external view returns (string memory);
    function choicesLength() external view returns (uint256);

    /// @notice Get timing information
    function start() external view returns (uint64);
    function end() external view returns (uint64);
    function timeUntilProposalStarts() external view returns (uint256);
    function timeUntilProposalEnds() external view returns (uint256);

    /// @notice Get governance rules
    function quorumMode() external view returns (QuorumMode);
    function quorumValue() external view returns (uint256);
    function thresholdMode() external view returns (ThresholdMode);
    function thresholdValue() external view returns (uint256);
    function abstainCountsTowardQuorum() external view returns (bool);
    function revealPolicy() external view returns (RevealPolicy);

    /// @notice Get execution configuration
    function execTargets(uint256 index) external view returns (address);
    function execValues(uint256 index) external view returns (uint256);
    function execCalldatas(uint256 index) external view returns (bytes memory);
    function execStrategy() external view returns (address);

    /// @notice Get factory and creator
    function factory() external view returns (address);
    function creator() external view returns (address);

    /// @notice Get voting status
    function hasVoted(address account) external view returns (bool);

    /// @notice Get decrypted results (after reveal)
    function resultsRevealed() external view returns (bool);
    function choiceVotes(uint256 index) external view returns (uint256);
    function proposalResolved() external view returns (bool);
    function proposalPassed() external view returns (bool);
    function winningChoice() external view returns (uint8);

    /// @notice Get automation status
    function autoRevealTriggered() external view returns (bool);

    // ============ Resolution Functions ============

    /// @notice Trigger resolution (called by factory's performUpkeep)
    function performUpkeep(bytes calldata performData) external;

    /// @notice Callback function called by DecryptionOracle
    function resolveProposalCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external;
}