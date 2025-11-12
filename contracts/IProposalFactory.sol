// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Proposal Factory Interface
/// @notice Standard interface for proposal factory contracts

// ============ Enums and Structs ============

enum ProposalType   { SingleChoice, Approval, Weighted, Quadratic, Ranked, Basic }
enum QuorumMode     { Absolute, PercentOfCast }
enum ThresholdMode  { SimpleMajority, SuperMajority }
enum RevealPolicy   { TotalsOnly, WinnerOnly, PerChoiceTotals, Custom }

struct FHEConfig {
    bool enabled;
}

struct CreateProposalParams {
    bytes32 spaceId;
    string title;
    string bodyURI;
    string discussionURI;
    string app;
    ProposalType pType;
    string[] choices;
    uint64 start;
    uint64 end;
    QuorumMode quorumMode;
    uint256 quorumValue;
    ThresholdMode thresholdMode;
    uint256 thresholdValue;
    bool abstainCountsTowardQuorum;
    RevealPolicy revealPolicy;
    FHEConfig fhe;
    address[] execTargets;
    uint256[] execValues;
    bytes[] execCalldatas;
    address execStrategy;
}

interface IProposalFactory {
    /// @notice Emitted when a new proposal is created
    /// @param spaceId The space identifier for the proposal
    /// @param proposalId Unique identifier for the proposal
    /// @param proposal Address of the deployed proposal contract
    /// @param p The parameters used to create the proposal
    event ProposalCreated(
        bytes32 indexed spaceId,
        bytes32 indexed proposalId,
        address proposal,
        CreateProposalParams p
    );

    /// @notice Create a new proposal
    /// @param p Parameters for creating the proposal
    /// @return proposal Address of the created proposal contract
    /// @return proposalId Unique identifier for the proposal
    function createProposal(CreateProposalParams calldata p)
        external
        returns (address proposal, bytes32 proposalId);
}