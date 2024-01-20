// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VestingAuthorizing {
    IERC20 immutable public token;
    address public owner;
    mapping(uint256 => bool) public usedNonces;

    constructor(IERC20 _vestedToken) {
        token = _vestedToken;
        owner = msg.sender;
    }

    function getMessageHash(address _to, uint _amount, uint _nonce) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_to, _amount, _nonce));
    }

    function getEthSignedMessageHash(bytes32 _messageHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    function claimTokens(address _to, uint _amount, uint _nonce, bytes memory signature) public {
        require(!usedNonces[_nonce], "nonce already used");
        usedNonces[_nonce] = true;

        bytes32 messageHash = getMessageHash(_to, _amount, _nonce);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        require(recoverSigner(ethSignedMessageHash, signature) == owner, "signature failed");
        token.transfer(_to, _amount);
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        return (r, s, v);
    }
}
