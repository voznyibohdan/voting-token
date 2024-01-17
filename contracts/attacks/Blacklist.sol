// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract Blacklist {
    address[] public blacklist;
    mapping(address => uint256) public lastUserTransferBlock;
    mapping(address => bool) public blacklistedUsers;

    function transfer() external {
        lastUserTransferBlock[msg.sender] = block.number;
        if (lastUserTransferBlock[msg.sender] >= 3) {
            blacklist.push(msg.sender);
        }
    }

    modifier notBlacklisted() {
        bool userBlacklisted = false;
        for (uint256 i = 0; i < blacklist.length; i++) {
            if (blacklist[i] == msg.sender) {
                userBlacklisted = true;
                break;
            }
        }
        require(!userBlacklisted, "user is in black list");
        _;
    }

//    modifier notBlacklisted() {
//        require(!blacklistedUsers[msg.sender], "user is in black list");
//    }

    function someFunction() external {
        if((block.number - lastUserTransferBlock[msg.sender]) >= 3) {
            blacklist.push(msg.sender);
//            blacklistedUsers[msg.sender] = true;
        }
    }

    function buy() external notBlacklisted {
        lastUserTransferBlock[msg.sender] = block.number;
    }
}
