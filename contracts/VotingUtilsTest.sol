// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./VotingUtils.sol";

/// @title Test contract for VotingUtils library
contract VotingUtilsTest {
    using VotingUtils for address[];

    address[] public allVotings;
    mapping(address => bool) public isCancelled;

    function addVoting(address voting) external {
        allVotings.push(voting);
    }

    function cancelVoting(address voting) external {
        isCancelled[voting] = true;
    }

    function filterVotings(uint8 status) external view returns (address[] memory) {
        return allVotings.filterVotings(isCancelled, status);
    }
}