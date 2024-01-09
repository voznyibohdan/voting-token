// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract ProxyContract {
    /// @notice Address of the current implementation contract.
    address public implementation;
    /// @notice Address of the owner of this proxy contract.
    /// @dev Only the owner can call the updateImplementation function
    address public owner;

    /// @dev Initializes the proxy contract with the provided implementation and owner.
    /// @param _implementation The address of the initial implementation contract.
    constructor(address _implementation) {
        _initialize(msg.sender, _implementation);
    }

    /// @dev Ensures that the caller is the owner of the proxy contract.
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;

    }

    /// @dev Internal function to initialize the proxy contract.
    /// @param _owner The address to set as the owner.
    /// @param _implementation The address of the initial implementation contract.
    function _initialize(address _owner, address _implementation) private {
        require((_owner != address(0) && (_implementation != address(0))), "Zero address");
        owner = _owner;
        implementation = _implementation;
    }

    /// @notice Updates the implementation contract.
    /// @dev Can only be called by the owner of the proxy.
    /// @param _implementation The new implementation contract address.
    function updateImplementation(address _implementation) external onlyOwner {
        require(_implementation != address(0), "Zero address");
        implementation = _implementation;
    }

    /// @dev Fallback function to delegate calls to the current implementation contract.
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

    /// @dev Fallback function to delegate calls to the current implementation contract.
    fallback() external payable {
        _fallback();
    }

    /// @dev Fallback function to delegate calls to the current implementation contract, and accept Ether.
    receive() external payable {
        _fallback();
    }
}
