// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PrivateProposal.sol";

/// @title Library for voting filtering utilities
/// @dev Extracted to reduce contract size through library usage
library VotingUtils {
    /// @notice Filter votings by status
    /// @param allVotings Array of all voting addresses
    /// @param isCancelled Mapping of cancelled votings
    /// @param status 0=upcoming, 1=active, 2=ended
    /// @return Filtered array of voting addresses
    function filterVotings(
        address[] storage allVotings,
        mapping(address => bool) storage isCancelled,
        uint8 status
    ) external view returns (address[] memory) {
        uint256 len = allVotings.length;
        uint256 count = 0;

        // First pass: count matching votings
        for (uint256 i = 0; i < len; ) {
            if (!isCancelled[allVotings[i]]) {
                PrivateProposal v = PrivateProposal(allVotings[i]);
                uint256 st = v.start();
                uint256 et = v.end();

                if ((status == 0 && block.timestamp < st) ||
                    (status == 1 && block.timestamp >= st && block.timestamp < et) ||
                    (status == 2 && block.timestamp >= et)) {
                    unchecked { ++count; }
                }
            }
            unchecked { ++i; }
        }

        address[] memory result = new address[](count);
        if (count == 0) return result;

        // Second pass: collect matching addresses
        uint256 idx = 0;
        for (uint256 i = 0; i < len; ) {
            if (!isCancelled[allVotings[i]]) {
                PrivateProposal v = PrivateProposal(allVotings[i]);
                uint256 st = v.start();
                uint256 et = v.end();

                if ((status == 0 && block.timestamp < st) ||
                    (status == 1 && block.timestamp >= st && block.timestamp < et) ||
                    (status == 2 && block.timestamp >= et)) {
                    result[idx] = allVotings[i];
                    unchecked { ++idx; }
                }
            }
            unchecked { ++i; }
        }
        return result;
    }
}