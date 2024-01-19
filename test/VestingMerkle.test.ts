import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { Implementation, VestingMerkle } from '../typechain-types';
import { Contract, ContractFactory } from 'ethers';
import { expect } from 'chai';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { defaultAbiCoder } from '@ethersproject/abi';

describe('Vesting Merkle', () => {
    const addresses = [
        { address: '0xF131FB9C741397935a5c99648f54c6368CBc5Eb5', amount: 10 },
        { address: '0x97239fB57E6C46c609215943B2Aa6F17E7A820c0', amount: 11 },
        { address: '0x8BE5302093e9282323cc475263F7dec6f126b91e', amount: 12 },
        { address: '0xB31259DFDAA154f85FBE86bE92af29e4CFeE5bbE', amount: 13 },
        { address: '0x3a16dBaC17956c333d395de76d1b6e1a95519C17', amount: 14 },
        { address: '0xA77eECde045260eA064133e437B28cFb60AF68e3', amount: 15 },
        { address: '0xDB9e15fA8fdBC43ffB51FA16a23654c3F724bdb3', amount: 16 },
        { address: '0xeA2eE70269909bE43f14a72Be5d38C3dEa990fb7', amount: 17 },
        { address: '0x39E6296A53Ff07a354eD61F955A329Ee1176eBdD', amount: 18 },
        { address: '0x9732454a4be953e7195096FedBbc3af22C197065', amount: 19 },
    ];

    const leaves = addresses.map(({ address, amount }) =>
        keccak256(defaultAbiCoder.encode(['address', 'uint256'], [address, amount])),
    );
    const tree = new MerkleTree(leaves, keccak256);
    const root = tree.getRoot();

    async function deploy() {
        const [owner, user]: HardhatEthersSigner[] = await ethers.getSigners();

        const ImplementationContract = await ethers.getContractFactory('Implementation');
        // @ts-ignore
        const implContract: Implementation = await ImplementationContract.deploy(1, 5, 5);
        const tokenAddress = await implContract.getAddress();

        const VestingContract: ContractFactory<any[], Contract> = await ethers.getContractFactory('VestingMerkle');
        // @ts-ignore
        const vestingMerkle: VestingMerkle = await VestingContract.deploy(tokenAddress);
        const vestingAddress = await vestingMerkle.getAddress();

        return {
            owner,
            user,
            tokenAddress,
            vestingAddress,
            vestingMerkle,
            implContract,
        };
    }

    describe('deploy', () => {
        it('Should set right token and owner address', async () => {
            const { owner, tokenAddress, vestingMerkle } = await deploy();
            expect(await vestingMerkle.owner()).to.equal(owner.address);
            expect(await vestingMerkle.token()).to.equal(tokenAddress);
        });
    });

    describe('vestTokens', () => {
        it('Should revert if called not by owner', async () => {
            const { user, vestingMerkle } = await deploy();
            await expect(vestingMerkle.connect(user).vestTokens(root)).to.revertedWith('not owner');
        });

        it('Should set correct merkle root', async () => {
            const { vestingMerkle } = await deploy();
            await vestingMerkle.vestTokens(root);

            const storedMerkleRoot = await vestingMerkle.merkleRoot();
            const bufferMerkleRoot = Buffer.from(storedMerkleRoot.slice(2), 'hex');

            expect(bufferMerkleRoot).to.deep.equal(root);
        });
    });

    describe('claimTokens', () => {
        it('Should revert', async () => {
            const { vestingMerkle, user } = await deploy();
            const userAmount = 10;
            const overUserAmount = 20;
            const leaf = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [user.address, userAmount]));
            const tree = new MerkleTree([leaf], keccak256);
            const proof = tree.getHexProof(leaf);
            const root = tree.getHexRoot();

            await expect(vestingMerkle.connect(user).claimTokens(userAmount, proof)).to.revertedWith('cannot claim');
            await vestingMerkle.vestTokens(root);
            await expect(vestingMerkle.connect(user).claimTokens(overUserAmount, proof)).to.revertedWith(
                'cannot claim',
            );
            await expect(vestingMerkle.connect(user).claimTokens(userAmount, proof)).to.revertedWith(
                'Insufficient balance',
            );
        });

        it('Should set addressClaim to true, transfer tokens to user', async () => {
            const { vestingMerkle, user, implContract, vestingAddress } = await deploy();
            const leaf = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [user.address, 10]));
            const tree = new MerkleTree([leaf], keccak256);
            const proof = tree.getHexProof(leaf);
            const root = tree.getHexRoot();

            const contractBalance = 20;
            const userVestingBalance = 10;

            await implContract.buy(contractBalance, { value: 20 });
            await implContract.transfer(vestingAddress, contractBalance);
            await vestingMerkle.vestTokens(root);
            await vestingMerkle.connect(user).claimTokens(userVestingBalance, proof);

            expect(await vestingMerkle.addressClaim(user.address)).to.equal(true);
            expect(await implContract.balances(user.address)).to.equal(userVestingBalance);
        });
    });
});
