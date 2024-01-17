// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VestingBasic {
    address public owner;
    IERC20 immutable public token;
    mapping (address => uint256) public claimableAmount;

    uint256 public cliff = 730 days;
    uint256 public vestingDate;

    constructor(IERC20 vestedToken) {
        token = vestedToken;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function vestTokensMany(address[] calldata toArray, uint256[] calldata amountArray) external onlyOwner {
        for (uint256 i = 0; i < toArray.length; i++) {
            claimableAmount[toArray[i]] = amountArray[i];
        }
        vestingDate = block.timestamp;
    }

    function claim(uint256 amount) external {
        require(_canClaim(amount), "cannot claim");
        claimableAmount[msg.sender] -= amount;
        token.transfer(msg.sender, amount);
    }

    function _canClaim(uint256 amount) private view returns(bool) {
        return (claimableAmount[msg.sender] >= amount) && ((vestingDate + cliff) <= block.timestamp);
    }
}
