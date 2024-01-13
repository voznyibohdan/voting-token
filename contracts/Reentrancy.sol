// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract Reentrancy {
    error NativeTokenTransferError();
    mapping(address => uint256) public balances;

    function deposit() payable external {
        balances[msg.sender] = msg.value;
    }

    function withdraw() external {
        (bool sent,) = payable(msg.sender).call{value : balances [msg.sender]}("");
        if (!sent) revert NativeTokenTransferError();

        delete balances[msg.sender];
    }

    function withdrawSafe() external {
        uint256 accountBalance = balances[msg.sender];
        delete balances[msg.sender];

        (bool sent,) = payable(msg.sender).call{value : balances [msg.sender]}("");
        if (!sent) revert NativeTokenTransferError();
    }
}
