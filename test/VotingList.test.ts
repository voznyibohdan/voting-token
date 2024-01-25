import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { VotingList } from '../typechain-types';
import { expect } from 'chai';

describe('Voting List', () => {
    async function deploy() {
        const [owner, voter1, voter2, voter3, voter4]: HardhatEthersSigner[] = await ethers.getSigners();
        console.log(owner);
        const Contract = await ethers.getContractFactory('VotingList');
        // @ts-ignore
        const contract: VotingList = await Contract.deploy();

        return {
            contract,
            voter1,
            voter2,
            voter3,
            voter4,
        };
    }

    async function startVotingAndVote(voter1Balance: number, voter2Balance: number) {
        const { contract, voter1, voter2 } = await deploy();

        const voter1ProposedPrice = 10;
        const voter2ProposedPrice = 20;

        await contract.connect(voter1).buy(voter1Balance, 0, 0);
        await contract.connect(voter2).buy(voter2Balance, 0, 0);

        await contract.connect(voter1).startVoting(voter1ProposedPrice);
        await contract.connect(voter2).vote(voter2ProposedPrice, 0, 0);

        const head = await contract.head();
        const headNode = await contract.nodes(head);

        return { head, headNode, voter1ProposedPrice, voter2ProposedPrice };
    }

    describe('startVoting', () => {
        it('Should set votingInProgress, currentVotingId and list head', async () => {
            const { contract, voter1 } = await deploy();

            const proposedPrice = 10;
            const userBalance = 100;
            const votingId = 2;

            await contract.connect(voter1).buy(userBalance, 0, 0);
            await contract.connect(voter1).startVoting(proposedPrice);

            const head = await contract.head();
            const headNode = await contract.nodes(head);

            expect(head).to.equal(10);
            expect(headNode[0]).to.equal(0);
            expect(headNode[1]).to.equal(userBalance);
            expect(headNode[2]).to.equal(votingId);
            expect(await contract.currentVotingId()).to.equal(votingId);
            expect(await contract.votingInProgress()).to.equal(true);
        });
    });

    describe('vote', () => {
        it('Should set new head', async () => {
            const voter1Balance = 100;
            const voter2Balance = 200;
            const { headNode, voter1ProposedPrice } = await startVotingAndVote(voter1Balance, voter2Balance);

            expect(headNode[0]).to.equal(voter1ProposedPrice);
            expect(headNode[1]).to.equal(voter2Balance);
        });

        it('Should set node to tail', async () => {
            const { contract, voter1, voter2 } = await deploy();

            const voter1ProposedPrice = 10;
            const voter2ProposedPrice = 20;
            const voter1Balance = 100;
            const voter2Balance = 50;

            await contract.connect(voter1).buy(voter1Balance, 0, 0);
            await contract.connect(voter2).buy(voter2Balance, 0, 0);

            await contract.connect(voter1).startVoting(voter1ProposedPrice);
            await contract.connect(voter2).vote(voter2ProposedPrice, voter1ProposedPrice, 0);

            const head = await contract.head();
            const headNode = await contract.nodes(head);
            const tailNode = await contract.nodes(voter2ProposedPrice);

            expect(headNode[0]).to.equal(voter2ProposedPrice);
            expect(tailNode[0]).to.equal(0);
        });

        it('Should set node between two nodes', async () => {
            const { contract, voter1, voter2, voter3 } = await deploy();

            const voter1ProposedPrice = 10;
            const voter2ProposedPrice = 20;
            const voter3ProposedPrice = 30;
            const voter1Balance = 100;
            const voter2Balance = 50;
            const voter3Balance = 75;

            await contract.connect(voter1).buy(voter1Balance, 0, 0);
            await contract.connect(voter2).buy(voter2Balance, 0, 0);
            await contract.connect(voter3).buy(voter3Balance, 0, 0);

            await contract.connect(voter1).startVoting(voter1ProposedPrice);
            await contract.connect(voter2).vote(voter2ProposedPrice, voter1ProposedPrice, 0);
            await contract.connect(voter3).vote(voter3ProposedPrice, voter1ProposedPrice, 0);

            const headNode = await contract.nodes(voter1ProposedPrice);
            const proposedNode = await contract.nodes(voter3ProposedPrice);

            expect(headNode[0]).to.equal(voter3ProposedPrice);
            expect(proposedNode[0]).to.equal(voter2ProposedPrice);
            expect(proposedNode[1]).to.equal(voter3Balance);
        });

        it('Should update existing head', async () => {
            const { contract, voter1, voter2 } = await deploy();

            const proposedPrice = 10;

            const voter1Balance = 100;
            const voter2Balance = 50;
            const expectedTotalVotes = voter1Balance + voter2Balance;

            await contract.connect(voter1).buy(voter1Balance, 0, 0);
            await contract.connect(voter2).buy(voter2Balance, 0, 0);

            await contract.connect(voter1).startVoting(proposedPrice);
            await contract.connect(voter2).vote(proposedPrice, 0, 0);

            const head = await contract.head();
            const headNode = await contract.nodes(head);

            expect(headNode[1]).to.equal(expectedTotalVotes);
        });

        it('Should update existing node and set it as head', async () => {
            const { contract, voter1, voter2, voter3 } = await deploy();

            const headPrice = 10;
            const proposedTwoTimesPrice = 20;

            const voter1Balance = 100;
            const voter2Balance = 50;
            const voter3Balance = 100;
            const expectedTotalVotes = voter2Balance + voter3Balance;

            await contract.connect(voter1).buy(voter1Balance, 0, 0);
            await contract.connect(voter2).buy(voter2Balance, 0, 0);
            await contract.connect(voter3).buy(voter3Balance, 0, 0);

            await contract.connect(voter1).startVoting(headPrice);
            await contract.connect(voter2).vote(proposedTwoTimesPrice, headPrice, 0);
            await contract.connect(voter3).vote(proposedTwoTimesPrice, 0, headPrice);

            const head = await contract.head();
            const oldHeadNode = await contract.nodes(headPrice);
            const newHeadNode = await contract.nodes(proposedTwoTimesPrice);

            expect(oldHeadNode[0]).to.equal(0);
            expect(newHeadNode[0]).to.equal(headPrice);
            expect(newHeadNode[1]).to.equal(expectedTotalVotes);
            expect(head).to.equal(proposedTwoTimesPrice);
        });

        it('Should update existing node position', async () => {
            const { contract, voter1, voter2, voter3, voter4 } = await deploy();

            const headPrice = 10;
            const secondaryPrice = 15;
            const proposedTwoTimesPrice = 20;

            const voter1Balance = 100;
            const voter2Balance = 50;
            const voter3Balance = 30;
            const voter4Balance = 40;
            const expectedTotalVotes = voter3Balance + voter4Balance;

            await contract.connect(voter1).buy(voter1Balance, 0, 0);
            await contract.connect(voter2).buy(voter2Balance, 0, 0);
            await contract.connect(voter3).buy(voter3Balance, 0, 0);
            await contract.connect(voter4).buy(voter4Balance, 0, 0);

            await contract.connect(voter1).startVoting(headPrice);
            await contract.connect(voter2).vote(secondaryPrice, headPrice, 0);
            await contract.connect(voter3).vote(proposedTwoTimesPrice, secondaryPrice, 0);
            await contract.connect(voter4).vote(proposedTwoTimesPrice, headPrice, secondaryPrice);

            const headNode = await contract.nodes(headPrice);
            const secondaryPriceNode = await contract.nodes(secondaryPrice);
            const proposedTwoTimesPriceNode = await contract.nodes(proposedTwoTimesPrice);

            console.log('proposedTwoTimesPriceNode: ', proposedTwoTimesPriceNode);

            expect(headNode[0]).to.equal(proposedTwoTimesPrice);
            expect(secondaryPriceNode[0]).to.equal(0);
            expect(proposedTwoTimesPriceNode[0]).to.equal(secondaryPrice);
            expect(proposedTwoTimesPriceNode[1]).to.equal(expectedTotalVotes);
        });
    });

    describe('buy', () => {
        it('Should increase price node votes by buying amount', async () => {
            const { contract, voter1 } = await deploy();

            const proposedPrice = 10;
            const userBalance = 100;
            const additionalUserAmount = 50;
            const expectedTotalVotes = userBalance + additionalUserAmount;

            await contract.connect(voter1).buy(userBalance, 0, 0);
            await contract.connect(voter1).startVoting(proposedPrice);
            await contract.connect(voter1).buy(additionalUserAmount, 0, 0);

            const head = await contract.head();
            const headNode = await contract.nodes(head);

            expect(headNode[1]).to.equal(expectedTotalVotes);
        });
    });

    describe('sell', () => {
        it('Should decrease price node votes by selling amount', async () => {
            const { contract, voter1 } = await deploy();

            const proposedPrice = 10;
            const userBalance = 100;
            const sellAmount = 60;
            const expectedTotalVotes = userBalance - sellAmount;

            await contract.connect(voter1).buy(userBalance, 0, 0);
            await contract.connect(voter1).startVoting(proposedPrice);
            await contract.connect(voter1).sell(sellAmount, 0, 0);

            const node = await contract.nodes(proposedPrice);

            expect(node[1]).to.equal(expectedTotalVotes);
        });
    });

    describe('transfer', () => {
        it('Should transfer tokens', async () => {
            const { contract, voter1, voter2 } = await deploy();

            const v1ProposedPrice = 10;
            const v2ProposedPrice = 20;

            const v1Balance = 100;
            const v2Balance = 50;

            // const transferAmount = 20;

            await contract.connect(voter1).buy(v1Balance, 0, 0);
            await contract.connect(voter2).buy(v2Balance, 0, 0);

            await contract.connect(voter1).startVoting(v1ProposedPrice);
            await contract.connect(voter2).vote(v2ProposedPrice, v1ProposedPrice, 0);

            const v1Node = await contract.nodes(v1ProposedPrice);
            const v2Node = await contract.nodes(v2ProposedPrice);

            console.log('v1Node: ', v1Node);
            console.log('v2Node: ', v2Node);
        });
    });
});
