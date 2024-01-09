import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { LogDescription } from 'ethers';
import { ethers } from 'hardhat';

import { Implementation } from '../typechain-types';

describe('Implementation Contract', () => {
	const zeroAddress = '0x0000000000000000000000000000000000000000';

	async function deploy() {
		const [userAccount, fromAccount, toAccount, testAccount] = await ethers.getSigners();

		const initialPrice = 1;
		const initialMinTokenAmount = 5;
		const initialFeePercentage = 5;

		const ImplementationContract = await ethers.getContractFactory('Implementation');
		const implContract: Implementation = await ImplementationContract.deploy(
			initialPrice,
			initialMinTokenAmount,
			initialFeePercentage
		);

		return {
			implContract,
			initialPrice,
			initialMinTokenAmount,
			initialFeePercentage,
			userAccount,
			fromAccount,
			toAccount,
			testAccount,
		};
	}

	async function buy(contract: Implementation, account: any, amount: number): Promise<void> {
		await contract.connect(account).buy(amount, { value: 100 });
	}

	async function approve(contract: Implementation, owner: any, spender: string, amount: number): Promise<void> {
		await contract.connect(owner).approve(spender, amount);
	}

	async function startVoting(contract: Implementation, user: any) {
		const userVotingWeight = 10;
		const votingPrice = 5;

		await buy(contract, user, userVotingWeight);
		const transaction = await contract.connect(user).startVoting(votingPrice);

		const receipt = await transaction.wait();
		const expectedEvent = contract.interface.parseLog(
			// @ts-ignore
			receipt.logs[0]
		) as LogDescription;

		const newPrice = await contract.prices(votingPrice);
		const timestamp = await ethers.provider.getBlock('latest');
		const expectedEndTime = Number(await contract.TIME_TO_VOTE()) + (timestamp?.timestamp as number);

		return {
			votingPrice,
			userVotingWeight,
			expectedEndTime,
			newPrice,
			expectedEvent,
		};
	}

	describe('Initial state', () => {
		it('Should set correct initial state', async () => {
			const { implContract, initialPrice, initialMinTokenAmount, initialFeePercentage } = await loadFixture(
				deploy
			);

			expect(await implContract.tokenPrice()).to.equal(initialPrice);
			expect(await implContract.minTokenAmount()).to.equal(initialMinTokenAmount);
			expect(await implContract.feePercentage()).to.equal(initialFeePercentage);
		});
	});

	describe('TotalSupply', () => {
		it('Should return correct total supply', async () => {
			const { implContract, userAccount } = await loadFixture(deploy);
			await buy(implContract, userAccount, 10);
			expect(await implContract.totalSupply()).to.equal(10);
		});
	});

	describe('BalanceOf', () => {
		it('Should return correct user balance', async () => {
			const { implContract, userAccount } = await loadFixture(deploy);
			await buy(implContract, userAccount, 10);
			expect(await implContract.balanceOf(userAccount.address)).to.equal(10);
		});
	});

	describe('Transfer', () => {
		it('Should revert', async () => {
			const { implContract, fromAccount, toAccount } = await loadFixture(deploy);
			await expect(implContract.connect(fromAccount).transfer(zeroAddress, 1)).to.revertedWith('Zero address');
			await startVoting(implContract, fromAccount);
			await expect(implContract.transfer(fromAccount.address, 1)).to.be.revertedWith('Insufficient balance');
			await expect(implContract.connect(fromAccount).transfer(toAccount.address, 1)).to.revertedWith(
				'Cant perform operation while voting is active'
			);
		});

		it('Should change user balances, emit Transfer event', async () => {
			const { implContract, fromAccount, toAccount } = await loadFixture(deploy);
			await buy(implContract, fromAccount, 10);
			await implContract.connect(fromAccount).transfer(toAccount, 5);

			expect(await implContract.balanceOf(fromAccount.address)).to.equal(5);
			expect(await implContract.balanceOf(toAccount.address)).to.equal(5);
			await expect(implContract.connect(fromAccount).transfer(toAccount, 5))
				.emit(implContract, 'Transfer')
				.withArgs(fromAccount, toAccount, 5);
		});
	});

	describe('Allowance', () => {
		it('Should return correct allowance', async () => {
			const { implContract, fromAccount, toAccount } = await loadFixture(deploy);
			expect(await implContract.allowance(fromAccount.address, toAccount.address)).to.equal(0);
		});
	});

	describe('Approve', () => {
		it('Should revert', async () => {
			const { implContract } = await loadFixture(deploy);
			await expect(implContract.approve(zeroAddress, 10)).to.revertedWith('Zero address');
		});

		it('Should set correct allowance and emit Approval event', async () => {
			const { implContract, fromAccount, toAccount } = await loadFixture(deploy);
			await approve(implContract, fromAccount, toAccount.address, 50);
			expect(await implContract.allowances(fromAccount.address, toAccount.address)).to.equal(50);
			await expect(implContract.connect(fromAccount).approve(toAccount.address, 1))
				.emit(implContract, 'Approval')
				.withArgs(fromAccount.address, toAccount.address, 1);
		});
	});

	describe('TransferFrom', () => {
		it('Should revert', async () => {
			const { implContract, fromAccount, toAccount, testAccount } = await loadFixture(deploy);
			await expect(implContract.transferFrom(fromAccount.address, zeroAddress, 10)).to.revertedWith(
				'Zero address'
			);
			await expect(implContract.transferFrom(fromAccount.address, toAccount.address, 10)).to.revertedWith(
				'Insufficient balance'
			);
			await buy(implContract, fromAccount, 10);
			await expect(implContract.transferFrom(fromAccount.address, toAccount.address, 10)).to.revertedWith(
				'Insufficient allowance'
			);

			await startVoting(implContract, testAccount);
			await approve(implContract, testAccount, testAccount.address, 1);
			await expect(implContract.connect(testAccount).transferFrom(testAccount.address, toAccount.address, 1))
				.to.revertedWith('Cant perform operation while voting is active');
		});

		it('Should change balances, change allowance, emit Transfer event', async () => {
			const { implContract, fromAccount, toAccount, testAccount } = await loadFixture(deploy);
			await buy(implContract, fromAccount, 10);
			await approve(implContract, fromAccount, fromAccount.address, 5);
			await implContract.connect(fromAccount).transferFrom(fromAccount.address, toAccount.address, 1);

			await startVoting(implContract, fromAccount);
			await ethers.provider.send('evm_increaseTime', [3600]);
			await implContract.endVoting();
			expect(await implContract.balanceOf(fromAccount.address)).to.equal(19);
			expect(await implContract.balanceOf(toAccount.address)).to.equal(1);
			expect(await implContract.allowances(fromAccount.address, fromAccount.address)).to.equal(4);

			await startVoting(implContract, testAccount);
			await expect(implContract.connect(fromAccount).transferFrom(fromAccount.address, toAccount.address, 1))
				.emit(implContract, 'Transfer')
				.withArgs(fromAccount.address, toAccount.address, 1);
		});
	});

	describe('StartVoting', () => {
		it('Should revert', async () => {
			const { implContract, userAccount, fromAccount } = await loadFixture(deploy);
			await expect(implContract.startVoting(1)).to.revertedWith('No tokens');
			await buy(implContract, userAccount, 100);
			await expect(implContract.connect(fromAccount).startVoting(1)).to.revertedWith(
				'Insufficient balance to execute this function'
			);
			await implContract.startVoting(1);
			await expect(implContract.startVoting(1)).to.revertedWith('Voting already in progress');
		});

		it('Should update votingId, voters, voting state, voting prices, leadingPrice, emit VotingStarted event', async () => {
			const { implContract, userAccount } = await loadFixture(deploy);

			const newVotingId = 2;

			const { userVotingWeight, expectedEndTime, newPrice, expectedEvent, votingPrice } = await startVoting(
				implContract,
				userAccount
			);

			expect(await implContract.votingId()).to.equal(newVotingId);
			expect(await implContract.voters(userAccount.address)).to.equal(newVotingId);
			expect(await implContract.isVotingInProgress()).to.equal(true);
			expect(await implContract.votingEndTime()).to.equal(expectedEndTime);
			expect(newPrice.votingId).to.equal(newVotingId);
			expect(newPrice.weight).to.equal(userVotingWeight);
			expect(await implContract.leadingPrice()).to.equal(votingPrice);
			expect(expectedEvent.name).to.equal('VotingStarted');
		});
	});

	describe('Vote', () => {
		it('Should revert', async () => {
			const { implContract, userAccount, fromAccount } = await loadFixture(deploy);
			await expect(implContract.vote(1)).to.revertedWith('No tokens');
			await buy(implContract, userAccount, 100);
			await expect(implContract.connect(fromAccount).vote(1)).to.revertedWith(
				'Insufficient balance to execute this function'
			);
			await buy(implContract, fromAccount, 100);
			await expect(implContract.vote(1)).to.revertedWith('Voting has not started yet');
			await startVoting(implContract, userAccount);
			await expect(implContract.vote(1)).to.revertedWith('Already voted');
		});

		it('Should update voters, set voting price, emit Voted event', async () => {
			const { implContract, userAccount, fromAccount, toAccount, testAccount } = await loadFixture(deploy);
			await startVoting(implContract, userAccount);
			await buy(implContract, fromAccount, 100);
			await buy(implContract, toAccount, 100);

			const votingId = 2;
			const proposedPrice = 20;
			await implContract.connect(fromAccount).vote(proposedPrice);
			const newVotingPrice = await implContract.prices(proposedPrice);

			expect(await implContract.voters(fromAccount.address)).to.equal(votingId);
			expect(newVotingPrice.votingId).to.eq(votingId);
			expect(newVotingPrice.weight).to.eq(100);
			expect(await implContract.leadingPrice()).to.eq(proposedPrice);
			await expect(implContract.connect(toAccount).vote(proposedPrice))
				.emit(implContract, 'Voted')
				.withArgs(toAccount.address, proposedPrice, 100);
			const updatedSameVotingPrice = await implContract.prices(20);
			await buy(implContract, testAccount, 100);
			await implContract.connect(testAccount).vote(1);
			expect(updatedSameVotingPrice.weight).to.equal(200);
		});
	});

	describe('EndVoting', () => {
		it('Should revert', async () => {
			const { implContract, userAccount } = await loadFixture(deploy);
			await expect(implContract.endVoting()).to.revertedWith('Voting is not in progress');
			await startVoting(implContract, userAccount);
			await expect(implContract.endVoting()).to.revertedWith('Voting period not ended yet');
		});

		it('Should set new tokenPrice, set leadingPrice to zero, VotingEnded', async () => {
			const { implContract, userAccount } = await loadFixture(deploy);
			const { votingPrice } = await startVoting(implContract, userAccount);
			await ethers.provider.send('evm_increaseTime', [3600]);
			await expect(implContract.endVoting()).emit(implContract, 'VotingEnded');
			expect(await implContract.tokenPrice()).to.equal(votingPrice);
			expect(await implContract.leadingPrice()).to.equal(0);
		});
	});

	describe('Buy', () => {
		it('Should revert', async () => {
			const { implContract, userAccount } = await loadFixture(deploy);
			await expect(implContract.connect(userAccount).buy(10, { value: 9 })).to.revertedWith(
				'Insufficient funds sent'
			);
			await startVoting(implContract, userAccount);
		});

		it('Should increase the users balance, total amount, etherPool, feePool, emit transfer event', async () => {
			const { implContract, userAccount } = await loadFixture(deploy);
			await expect(implContract.connect(userAccount).buy(10, { value: 10 }))
				.emit(implContract, 'Transfer')
				.withArgs(zeroAddress, userAccount.address, 10);

			expect(await implContract.totalSupply()).to.equal(10);
			expect(await implContract.balances(userAccount.address)).to.equal(10);
			expect(await implContract.etherPool()).to.equal(10);
			expect(await implContract.feePool()).to.equal(0);
		});
	});

	describe('Sell', () => {
		it('Should revert', async () => {
			const { implContract, userAccount } = await loadFixture(deploy);
			await expect(implContract.sell(10)).to.revertedWith('Insufficient tokens');
			await startVoting(implContract, userAccount);
			await expect(implContract.sell(1)).to.revertedWith('Cant perform operation while voting is active');
		});

		it('Should decrease etherPool, user amount, tokenTotalSupply, emit Burn event', async () => {
			const { implContract, userAccount } = await loadFixture(deploy);
			await buy(implContract, userAccount, 10);

			await expect(implContract.sell(5)).emit(implContract, 'Burn').withArgs(userAccount.address, 5);
			expect(await implContract.totalSupply()).to.equal(5);
			expect(await implContract.etherPool()).to.equal(5);
			expect(await implContract.balances(userAccount.address)).to.equal(5);
		});
	});

	describe('BurnFee', () => {
		it('Should revert', async () => {
			const { implContract } = await loadFixture(deploy);
			await expect(implContract.burnFee()).to.revertedWith('A week has not yet passed since the last burning');
		});

		it('Should set correct lastFeeBurnDate, set feePool to zero', async () => {
			const { implContract } = await loadFixture(deploy);

			const week = 60 * 60 * 24 * 7;
			await ethers.provider.send('evm_increaseTime', [week]);
			await implContract.burnFee();

			const timestamp = await ethers.provider.getBlock('latest');
			const updatedLastFeeBurnDate = await implContract.lastFeeBurnDate();
			expect(updatedLastFeeBurnDate).to.equal(timestamp?.timestamp);

			const updatedFeePool = await implContract.feePool();
			expect(updatedFeePool).to.equal(0);
		});
	});
});
