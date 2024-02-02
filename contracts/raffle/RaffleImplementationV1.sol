// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract RaffleImplementationV1 {
    ISwapRouter public immutable swapRouter;
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    address public owner;
    mapping(address => bool) public allowedTokens;

    uint256 public rafflePool;
    uint256 public raffleRandomNumber;
    bool public isRuffleActive;

    struct Participant {
        uint256 rangeFrom;
        uint256 rangeTo;
        address account;
        IERC20 token;
    }
    Participant[] public participants;

    event Deposit(address user, IERC20 token, uint256 amount);
    event RaffleStarted(uint256 time);
    event RaffleEnded(address winner, uint256 time);

    constructor(ISwapRouter _swapRouter) {
        owner = msg.sender;
        swapRouter = _swapRouter;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyAllowedTokens(address _token) {
        require(allowedTokens[_token], "Token not allowed");
        _;
    }

    function addAllowedToken(address _token) external onlyOwner {
        allowedTokens[_token] = true;
    }

    function removeAllowedToken(address _token) external onlyOwner {
        allowedTokens[_token] = false;
    }

    function getLatestTokenPrice(address _token) public view onlyAllowedTokens(_token) returns (int) {
        AggregatorV3Interface tokenPriceFeed = AggregatorV3Interface(_token);
        require(address(tokenPriceFeed) == _token, "Invalid token address");
        (, int price, , ,) = tokenPriceFeed.latestRoundData();
        return price;
    }

    function startRuffle() external onlyOwner {
        require(!isRuffleActive, "Ruffle alredy in progress");
        isRuffleActive = true;
        raffleRandomNumber = generateRandomNumber(rafflePool);

        emit RaffleStarted(block.timestamp);
    }

    function endRuffle(uint256 _winnerIndex) external onlyOwner {
        require(isRuffleActive, "Ruffle is not active");
        
        Participant memory winner = participants[_winnerIndex];
        require(winner.rangeFrom <= raffleRandomNumber && winner.rangeTo >= raffleRandomNumber, "Wrong winner index");

        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: getPathForETHtoToken(winner.token),
            recipient: address(this),
            deadline: block.timestamp + 1000,
            amountIn: rafflePool,
            amountOutMinimum: 0
        });
        uint256 amountOut = swapRouter.exactInput(params);
        winner.token.transfer(winner.account, amountOut);

        isRuffleActive = false;
        raffleRandomNumber = 0;
        delete participants;

        emit RaffleEnded(winner.account, block.timestamp);
    }

    function swap(address _tokenIn, address _tokenOut, uint256 _amountIn, address _to) external {
        IERC20(_tokenIn).transferFrom(msg.sender, address(this), _amountIn);
        IERC20(_tokenIn).approve(0xE592427A0AEce92De3Edee1F18E0157C05861564, _amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            fee: 3000,
            recipient: _to,
            deadline: block.timestamp,
            amountIn: _amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        uint256 amountOut = swapRouter.exactInputSingle{value: _amountIn}(params);
    }

    function deposit(address _tokenIn, uint256 _amountIn) external onlyAllowedTokens(_tokenIn) returns(uint256) {
        // add approve amount before
        IERC20(_tokenIn).transferFrom(msg.sender, address(this), _amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: _tokenIn,
            tokenOut: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            fee: 3000,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: _amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        uint256 amountOut = swapRouter.exactInputSingle{value: _amountIn}(params);
        return amountOut;
    }

//    function deposit(address _token, uint256 _amount) external onlyAllowedTokens(_token) {
//        IERC20 tokenContract = IERC20(_token);
//        tokenContract.transferFrom(msg.sender, address(this), _amount);
//
//        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
//            tokenIn: address(tokenContract),
//            tokenOut: WETH9,
//            fee: 1000,
//            recipient: address(this),
//            deadline: block.timestamp,
//            amountIn: _amount,
//            amountOutMinimum: 0,
//            sqrtPriceLimitX96: 0
//        });
//        uint256 amountOut = swapRouter.exactInputSingle(params);
//
//        int tokenPrice = getLatestTokenPrice(_token);
//        uint256 uintTokenPrice = uint(tokenPrice);
//
//        uint256 equivalentETHAmount = (amountOut * uintTokenPrice) / (10 ** 18);
//        uint256 updatedRafflePool = rafflePool + equivalentETHAmount;
//
//        Participant memory participant = Participant({
//            rangeFrom: rafflePool++,
//            rangeTo: updatedRafflePool,
//            account: msg.sender,
//            token: tokenContract
//        });
//
//        rafflePool = updatedRafflePool;
//
//        participants.push(participant);
//        emit Deposit(msg.sender, tokenContract, _amount);
//    }

//    function deposit(address tokenAddress, uint256 tokensAmount) external onlyAllowedTokens(tokenAddress) {
//        // Step 1: Transfer tokens from the user to the contract
//        IERC20(tokenAddress).transferFrom(msg.sender, address(this), tokensAmount);
//
//        // Step 2: Swap the received tokens to ETH using Uniswap V3
//        address[] memory path = new address[](2);
//        path[0] = tokenAddress;
//        path[1] = WETH9; // WETH is needed for swapping to ETH
//
//        // Approve Uniswap Router to spend the tokens
//        IERC20(tokenAddress).approve(swapRouter, tokensAmount);
//
//        // Swap tokens to ETH
//        uint256 ethReceived = ISwapRouter(swapRouter).exactInputSingle(
//            ISwapRouter.ExactInputSingleParams({
//                tokenIn: tokenAddress,
//                tokenOut: WETH9,
//                fee: 3000, // Assuming 0.3% fee (3000 out of 1e5)
//                recipient: address(this),
//                deadline: block.timestamp + 600, // 10-minute deadline
//                amountIn: tokensAmount,
//                amountOutMinimum: 0, // Minimum acceptable ETH amount
//                sqrtPriceLimitX96: 0 // No price limit
//            })
//        );
//
//        // Update the total Ether balance of the contract
//        rafflePool += ethReceived;
//    }

    function generateRandomNumber(uint256 max) public view returns (uint256) {
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), "random* seed value")));
        return randomNumber = randomNumber % max + 1;
    }
    
    function getPathForETHtoToken(IERC20 _token) public pure returns (bytes memory) {
        address[] memory path = new address[](2);
        path[0] = WETH9;
        path[1] = address(_token);
        return abi.encodePacked(path);
    }
}
