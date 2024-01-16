// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract DOS {
    address[] public voters;

    function vote(address user) external {
        voters.push(user);
    }

    function endVoting() external {
        for (uint256 i = 0; i <= voters.length; i++) {}
    }
}
