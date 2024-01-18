// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract VestingMerkle {
    address public owner;

    mapping (address => bool) public addressClaim;
    bytes32 public merkleRoot;
    IERC20 immutable public token;

    constructor(IERC20 vestedToken) {
        token = vestedToken;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function vestTokens(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function claimTokens(uint256 amount, bytes32[] calldata proof) external {
        require(canClaimTokens(amount, proof), "cannot claim");
        addressClaim[msg.sender] = true;
        token.transfer(msg.sender, amount);
    }

    function canClaimTokens(uint256 amount, bytes32[] calldata proof) private view returns (bool) {
        bytes32 leaf = keccak256(abi.encode(msg.sender, amount));
        return addressClaim[msg.sender] == false &&
            MerkleProof.verify(proof, merkleRoot, leaf);
    }
}
