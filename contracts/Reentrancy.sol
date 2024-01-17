// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Reentrancy is ReentrancyGuard {
    mapping(address => uint256) public balances;

    constructor() {
    }

    function deposit() external payable {
        balances[msg.sender] = msg.value;
    }

    function withdraw() external {
        uint256 accountBalance = balances[msg.sender];
        (bool sent,) = payable(msg.sender).call{value : accountBalance}("");
        require(sent, "withdraw sent error");

        balances[msg.sender] -= accountBalance;
    }

//    function withdrawSafe() external nonReentrant {
//        uint256 accountBalance = balances[msg.sender];
//        balances[msg.sender] = 0;
//
//        payable(msg.sender).transfer(accountBalance);
//    }
}
