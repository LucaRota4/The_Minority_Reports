// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockENS {
    mapping(bytes32 => address) public owners;

    function setNodeOwner(bytes32 node, address newOwner) external {
        owners[node] = newOwner;
    }

    function owner(bytes32 node) external view returns (address) {
        return owners[node];
    }
}