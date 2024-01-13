// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract DOS {
    address[] public voters;

    function vote() external {
        voters.push(msg.sender);
    }

    function votingResults() external {
        for (uint256 i = 0; i <= voters.length; i++) {

        }
    }
}
