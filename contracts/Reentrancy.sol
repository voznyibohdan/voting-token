// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract Reentrancy {
    mapping(address => uint256) public balances;
    uint256 public num;

    constructor(uint256 _num) {
        num = _num;
    }

    function deposit() external payable {
        balances[msg.sender] = msg.value;
    }

    function withdraw() external {
        (bool sent,) = payable(msg.sender).call{value : balances[msg.sender]}("");
        require(sent, "withdraw sent error");

        balances[msg.sender] = 0;
    }

//    function withdrawSafe() external {
//        uint256 accountBalance = balances[msg.sender];
//        delete balances[msg.sender];
//
//        (bool sent,) = payable(msg.sender).call{value : balances[msg.sender]}("");
//        if (!sent) revert NativeTokenTransferError();
//    }
}
