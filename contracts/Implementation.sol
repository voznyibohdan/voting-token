// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title An IERC20 contract named Implementation
/// @dev Inherits the OpenZepplin IERC20 implentation
contract Implementation is IERC20 {
    /// @notice Total supply of the token.
    uint256 public tokenTotalSupply;
    /// @notice Current price of the token.
    uint256 public tokenPrice;
    /// @notice Minimum amount of tokens required for certain operations.
    uint256 public minTokenAmount;
    /// @notice Total Ether accumulated from token purchases.
    uint256 public etherPool;
    /// @notice Total fees collected.
    uint256 public feePool;
    /// @notice Percentage fee for transactions.
    uint256 public feePercentage;
    /// @notice Last date when fees were burned.
    uint256 public lastFeeBurnDate = block.timestamp;
    /// @notice Percentage fee for buy/sell transactions.
    uint256 public buySellFeePercentage;
    /// @notice Current leading price during voting.
    uint256 public leadingPrice;
    /// @notice Identifier for the current voting.
    uint256 public votingId = 1;
    /// @notice End time for the ongoing voting.
    uint256 public votingEndTime;
    /// @dev Constant representing the duration of a voting round.
    uint256 public constant TIME_TO_VOTE = 30 minutes;
    /// @notice Flag indicating whether a voting round is in progress.
    bool public isVotingInProgress = false;

    /// @notice Struct representing a price in the voting process.
    struct Price {
        uint256 votingId;
        uint256 weight;
    }

    /// @notice Mapping of prices to their corresponding voting details.
    mapping(uint256 => Price) public prices;
    /// @notice Mapping of addresses to the votingId in which they participated.
    mapping(address => uint256) public voters;
    /// @notice Mapping of addresses to their token balances.
    mapping(address => uint256) public balances;
    /// @notice Mapping of allowances for spending tokens.
    mapping(address => mapping(address => uint256)) public allowances;

    /// @dev Initializes contract with the provided tokenPrice, minTokenAmount and feePercentage.
    constructor(uint256 initialTokenPrice, uint256 initialMinTokenAmount, uint256 initialFeePercentage) {
        tokenPrice = initialTokenPrice;
        minTokenAmount = initialMinTokenAmount;
        feePercentage = initialFeePercentage;
    }

    /// @dev Makes sure that the user can perform an action only if he did not participate in the current vote
    modifier onlyAfterVoting() {
        if (isVotingInProgress) {
            require(voters[msg.sender] != votingId, "Cant perform operation while voting is active");
        }
        _;
    }
    /// @dev Makes sure that the user's balance meets the minimum required percentage of total tokenTotalSupply
    modifier hasMinimumBalance(uint256 percentage) {
        require(tokenTotalSupply > 0, "No tokens");
        require(
            (((balances[msg.sender] * 100) / tokenTotalSupply) * 100) >= percentage,
            "Insufficient balance to execute this function"
        );
        _;
    }

    /// @dev Makes sure that provided address is not zero address
    modifier validDestination(address to) {
        require(to != address(0x0), "Zero address");
        _;
    }

    /// @notice Emitted when a new voting round starts.
    event VotingStarted(uint256 startTime, uint256 endTime);
    /// @notice Emitted when a user votes in the ongoing round.
    event Voted(address indexed voter, uint256 price, uint256 votes);
    /// @notice Emitted when a voting round ends.
    event VotingEnded(uint256 endTime, uint256 price);
    /// @notice Emitted when tokens are burned.
    event Burn(address indexed from, uint256 value);

    /// @inheritdoc IERC20
    function totalSupply() external view returns(uint256) {
        return tokenTotalSupply;
    }

    /// @inheritdoc IERC20
    function balanceOf(address account) external view override returns (uint256) {
        return balances[account];
    }

    /// @inheritdoc IERC20
    function transfer(address to, uint256 amount) external override onlyAfterVoting validDestination(to) returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /// @inheritdoc IERC20
    function allowance(address owner, address spender) external view override returns (uint256) {
        return allowances[owner][spender];
    }

    /// @inheritdoc IERC20
    function approve(address spender, uint256 amount) external validDestination(spender) returns (bool) {
        allowances[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
        bool resp = true;
        return resp;
    }

    /// @inheritdoc IERC20
    function transferFrom(address from, address to, uint256 amount) external override onlyAfterVoting validDestination(to) returns (bool) {
        require(balances[from] >= amount, "Insufficient balance");
        require(allowances[from][msg.sender] >= amount, "Insufficient allowance");

        balances[from] -= amount;
        balances[to] += amount;
        allowances[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    /// @dev Mint new tokens and assign them to an account.
    function _mint(address account, uint256 amount) private {
        balances[account] += amount;
        tokenTotalSupply += amount;

        emit Transfer(address(0), account, amount);
    }

    /// @dev Burn tokens from an account.
    function _burn(address account, uint256 amount) private {
        balances[account] -= amount;
        tokenTotalSupply -= amount;

        emit Burn(account, amount);
    }

    /// @notice Burn accumulated fees.
    function burnFee() external {
        require((block.timestamp - 1 weeks) >= lastFeeBurnDate, "A week has not yet passed since the last burning");
        lastFeeBurnDate = block.timestamp;
        feePool = 0;
    }

    /// @notice Start a new voting round.
    /// @dev This function allows users to initiate a new voting round by specifying a price.
    /// Users must have a minimum balance of at least 1% of the total token supply to start voting.
    /// Only one voting round can be active at a time.
    /// The leading price is set to the provided price, and the user becomes the initial voter with their weight.
    /// Emits a `VotingStarted` event with the start and end times of the voting round.
    /// @param price The price for which the voting round is initiated.
    function startVoting(uint256 price) external hasMinimumBalance(1) {
        require(!isVotingInProgress, "Voting already in progress");

        votingId++;
        voters[msg.sender] = votingId;
        isVotingInProgress = true;
        votingEndTime = block.timestamp + TIME_TO_VOTE;
        prices[price] = Price({ votingId: votingId, weight: balances[msg.sender] });
        leadingPrice = price;

        emit VotingStarted(block.timestamp, votingEndTime);
    }

    /// @notice Vote for a specific price in the ongoing voting round.
    /// @dev This function allows users to cast their votes for a specified price during an active voting round.
    /// Users must have a minimum balance of at least `minTokenAmount` to participate in the voting.
    /// Users can only vote once per voting round.
    /// The provided price and the user's token balance contribute to the overall weight for that price.
    /// If the provided price is not present in the current round, a new entry is created with the user's weight.
    /// If the user's weight for the provided price becomes the leading weight, the price becomes the new leading price.
    /// Emits a `Voted` event indicating the user's vote and the associated weight.
    /// @param price The price for which the user is casting their vote.
    function vote(uint256 price) external hasMinimumBalance(minTokenAmount) {
        require(isVotingInProgress, "Voting has not started yet");
        require(voters[msg.sender] != votingId, "Already voted");

        voters[msg.sender] = votingId;

        if (prices[price].votingId == votingId) {
            prices[price].weight += balances[msg.sender];
        } else {
            prices[price] = Price({ votingId : votingId, weight : balances[msg.sender] });
        }

        if (prices[price].weight >= prices[leadingPrice].weight) {
            leadingPrice = price;
        }

        emit Voted(msg.sender, price, balances[msg.sender]);
    }

    /// @notice End the ongoing voting round and determine the winning price.
    /// @dev This function finalizes the ongoing voting round, updating the token price based on the winning price.
    /// It can only be called when a voting round is currently in progress, and the voting period has ended.
    /// The winning price is determined by the price with the highest accumulated weight.
    /// The token price is updated to the winning price, and the `VotingEnded` event is emitted.
    /// The leading price is reset, and the voting status is marked as not in progress.
    function endVoting() external {
        require(isVotingInProgress, "Voting is not in progress");
        require(block.timestamp > votingEndTime, "Voting period not ended yet");

        tokenPrice = leadingPrice;
        emit VotingEnded(block.timestamp, leadingPrice);

        leadingPrice = 0;
        isVotingInProgress = false;
    }

    /// @notice Buy tokens with Ether.
    /// @dev This function allows users to purchase a specified amount of tokens by sending Ether.
    /// The cost of the tokens is calculated based on the provided amount and the current token price.
    /// Users must send enough Ether to cover both the token cost and the associated fee.
    /// The purchased tokens are minted to the buyer's address, and the Ether cost and fee are added to the respective pools.
    /// Emits a `Transfer` event for the minted tokens.
    /// @param amount The amount of tokens to purchase.
    function buy(uint256 amount) external payable {
        (uint256 ethCost, uint256 fee) = _calculateCost(amount);
        uint256 totalCost = ethCost + fee;

        require(msg.value >= totalCost, "Insufficient funds sent");

        _mint(msg.sender, amount);
        etherPool += ethCost;
        feePool += fee;
    }

    /// @notice Sell tokens for Ether.
    /// @dev This function allows users to sell a specified amount of tokens in exchange for Ether.
    /// Users must have a balance of at least the specified amount of tokens to perform the sale.
    /// The cost of the sold tokens is calculated based on the provided amount and the current token price.
    /// The Ether earned from the sale, after deducting the fee, is transferred to the seller's address.
    /// The sold tokens are burned, and the earned Ether is subtracted from the Ether pool.
    /// The function can only be called after the voting round has concluded.
    /// Emits a `Burn` event for fee burning.
    /// @param amount The amount of tokens to sell.
    function sell(uint256 amount) external payable onlyAfterVoting {
        require(balances[msg.sender] >= amount, "Insufficient tokens");

        (uint256 ethCost, uint256 fee) = _calculateCost(amount);
        uint256 earned = ethCost - fee;

        etherPool -= earned;

        _burn(msg.sender, amount);
        payable(msg.sender).transfer(earned);
    }

    /// @notice Calculate the cost (Ether and fee) for a given amount of tokens.
    /// @dev This internal function calculates the total Ether cost and fee for purchasing or selling a specified amount of tokens.
    /// The Ether cost is determined by multiplying the token amount by the current token price.
    /// The fee is calculated as a percentage of the Ether cost, based on the contract's fee percentage.
    /// @param tokenAmount The amount of tokens for which to calculate the cost.
    /// @return ethCost The total Ether cost for the specified amount of tokens.
    function _calculateCost(uint256 tokenAmount) private view returns (uint256, uint256) {
        uint256 ethCost = tokenAmount * tokenPrice;
        uint256 fee = (ethCost * feePercentage) / 10_000;
        return (ethCost, fee);
    }
}
