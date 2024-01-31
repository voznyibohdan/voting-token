// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract Raffle {
    address public implementation;
    address public owner;

    constructor(address _implementation) {
        _initialize(msg.sender, _implementation);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    function _initialize(address _owner, address _implementation) private {
        require((_owner != address(0) && (_implementation != address(0))), "Zero address");
        owner = _owner;
        implementation = _implementation;
    }

    function updateImplementation(address _implementation) external onlyOwner {
        require(_implementation != address(0), "Zero address");
        implementation = _implementation;
    }

    function _fallback() private {
        address _impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    fallback() external payable {
        _fallback();
    }

    receive() external payable {
        _fallback();
    }
}
