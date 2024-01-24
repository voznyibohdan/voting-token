// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract VotingList {
    struct Node {
        uint256 next;
        uint256 votes;
        uint256 votingId;
    }

    struct Voter {
        uint256 votedPrice;
        uint256 votingId;
    }

    mapping(uint256 => Node) public nodes;
    mapping(address => Voter) public voters;
    mapping(address => uint256) public balances;

    uint256 public head;

    uint256 public currentVotingId = 1;
    bool public votingInProgress;
 
    constructor() {}

    function startVoting(uint256 _price) external {
        currentVotingId += 1;
        nodes[_price] = Node({next: 0, votes: balances[msg.sender], votingId: currentVotingId});
    }

    function vote(uint256 _price, uint256 _prevNodeId, uint256 _currentPrevNodeId) external {
        Node memory prevNode = nodes[_prevNodeId];
        Node memory priceNode = nodes[_price];

        uint256 afterNodeVotes = nodes[prevNode.next].votes;
        uint256 userBalance = balances[msg.sender];

        if (priceNode.votingId == currentVotingId) {
            uint256 updatedNodeVotes = priceNode.votes + userBalance;
            _updatingExistingNode(priceNode, prevNode, updatedNodeVotes, _prevNodeId, _currentPrevNodeId, afterNodeVotes, _price);
            return;
        }

        if (_prevNodeId == 0) {
            _setNewHead(userBalance, _price);
        } else if (prevNode.next == 0) {
            _setNewTail(prevNode, _prevNodeId, userBalance, _price);
        } else {
            _createNode(prevNode, _prevNodeId, afterNodeVotes, userBalance, _price);
        }
    }

    function buy(uint256 _amount, uint256 _prevNodeId, uint256 _currentPrevNodeId) external {
        Voter memory voter = voters[msg.sender];

        if (votingInProgress && (voter.votingId == currentVotingId)) {
            Node memory priceNode = nodes[voter.votedPrice];
            Node memory prevNode = nodes[_prevNodeId];

            uint256 updatedNodeVotes = priceNode.votes + _amount;

            _updatingExistingNode(
                priceNode, 
                prevNode, 
                updatedNodeVotes, 
                _prevNodeId, 
                _currentPrevNodeId, 
                nodes[prevNode.next].votes, 
                voter.votedPrice
            );
        }

        balances[msg.sender] += _amount;
    }

    function sell(uint256 _amount, uint256 _prevNodeId, uint256 _currentPrevNodeId) external {
        Voter memory voter = voters[msg.sender];

        if (votingInProgress && (voter.votingId == currentVotingId)) {
            Node memory priceNode = nodes[voter.votedPrice];
            _manageIncreasingPrice(voter.votedPrice, _amount, _prevNodeId, _currentPrevNodeId, priceNode.next);
        }
    }

    function transfer(
        address _to, 
        uint256 _amount,

        uint256 _dPrevNodeId,
        uint256 _dCurrentPrevNodeId,

        uint256 _iPrevNodeId,
        uint256 _iCurrentPrevNodeId
    ) external {
        Voter memory sender = voters[msg.sender];
        Voter memory receiver = voters[_to];

        Node memory decreasingPrice = nodes[sender.votedPrice];
        Node memory increasingPrice = nodes[sender.votedPrice];

        uint256 updatedNodeVotes = increasingPrice.votes + _amount;
        uint256 afterNodeVotes = nodes[increasingPrice.next].votes;

        _manageIncreasingPrice(sender.votedPrice, _amount, _dPrevNodeId, _dCurrentPrevNodeId, decreasingPrice.next);
        _updatingExistingNode(increasingPrice, nodes[_iPrevNodeId], updatedNodeVotes, _iPrevNodeId, _iCurrentPrevNodeId, afterNodeVotes, receiver.votedPrice);
    }

    function _updatingExistingNode(
        Node memory _priceNode,
        Node memory _prevNode,
        uint256 _updatedNodeVotes,
        uint256 _prevNodeId,
        uint256 _currentPrevNodeId,
        uint256 _afterNodeVotes,
        uint256 _price
    ) private {
        if (_prevNodeId == 0 && _currentPrevNodeId == 0) {
            require(head == _price, "incorrect position");
            nodes[_price].votes = _updatedNodeVotes;
            return;
        }

        require(nodes[_currentPrevNodeId].next == _price, "incorrect position");
        
        if (_prevNodeId == 0) {
            require(_updatedNodeVotes > nodes[head].votes, "incorrect position");
            _removeNode(_currentPrevNodeId, _priceNode.next);
            nodes[_price].next = head;
            nodes[_price].votes = _updatedNodeVotes;
            head = _price;
        } else {
            require(_prevNode.votes >= _updatedNodeVotes && _afterNodeVotes <= _updatedNodeVotes, "incorrect position");
            _updateNodePosition(_currentPrevNodeId, _priceNode.next, _prevNodeId, _prevNode.next, _price);
        }
    }

    function _manageIncreasingPrice(
        uint256 _price, 
        uint256 _amount, 
        uint256 _prevNodeId,
        uint256 _currentPrevNodeId,
        uint256 _priceNodeNextId
    ) private {
        if (head == _price) {
            uint256 secondPlaceId = nodes[head].next;
            uint256 newVotes = nodes[head].votes - _amount;
            uint256 secondPlasceVotes = nodes[secondPlaceId].votes;

            if (secondPlasceVotes > newVotes) {
                head = secondPlaceId;
                _updateNodePosition(_currentPrevNodeId, _priceNodeNextId, _prevNodeId, nodes[_prevNodeId].next, _price);
            } else {
                nodes[head].votes = newVotes;
            }

            return;
        }

        _updateNodePosition(_currentPrevNodeId, _priceNodeNextId, _prevNodeId, nodes[_prevNodeId].next, _price);
    }

    function _updateNodePosition(
        uint256 _currentPrevNodeId,
        uint256 _currentNextNodeId,
        uint256 _newPrevNodeId, 
        uint256 _newnextNodeId, 
        uint256 _nodeId 
    ) private {
        _removeNode(_currentPrevNodeId, _currentNextNodeId);
        _insertNode(_newPrevNodeId, _newnextNodeId, _nodeId);
    }

    function _removeNode(uint256 _prevNodeId, uint256 _nextNodeId) private {
        nodes[_prevNodeId].next = _nextNodeId;
    }

    function _insertNode(uint256 _newPrevNodeId, uint256 _newnextNodeId, uint256 _nodeId) private {
        nodes[_nodeId].next = _newnextNodeId;
        nodes[_newPrevNodeId].next = _nodeId;
    }

    function _setNewHead(uint256 _userBalance, uint256 _newNodeId) private {
        require(_userBalance > nodes[head].votes, "incorrect position");
        nodes[_newNodeId] = Node({next: head, votes: _userBalance, votingId: currentVotingId});
        head = _newNodeId;
    }

    function _setNewTail(Node memory _tailNode, uint256 _tailId, uint256 _userBalance, uint256 _newNodeId) private {
        require(_tailNode.votes >= _userBalance, "incorrect position");
        nodes[_newNodeId] = Node({next: 0, votes: _userBalance, votingId: currentVotingId});
        nodes[_tailId].next = _newNodeId;
    }

    function _createNode(
        Node memory _prevNode, 
        uint256 _prevNodeId, 
        uint256 _afterNodeVotes, 
        uint256 _userbalance, 
        uint256 _newNodeId
    ) private {
        require(_prevNode.votes >= _userbalance && _afterNodeVotes <= _userbalance, "incorrect position");
        nodes[_newNodeId] = Node({next: _prevNode.next, votes: _userbalance, votingId: currentVotingId});
        nodes[_prevNodeId].next = _newNodeId;
    }
}
