import { ethers } from 'hardhat';
import { Contract, ContractFactory } from 'ethers';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { Implementation, VestingBasic } from '../typechain-types';

describe('Vesting Basic', () => {
    // const addresses = Array.from({ length: 10_000 }, () => {
    //     return Wallet.createRandom().address
    // });
    // const amounts = Array.from({ length: 10_000 }, (_, index) => {
    //     return index++
    // });

    async function deploy() {
        const [owner, defaultUser]: HardhatEthersSigner[] =
            await ethers.getSigners();

        const initialPrice = 1;
        const initialMinTokenAmount = 5;
        const initialFeePercentage = 5;

        const ImplementationContract =
            await ethers.getContractFactory('Implementation');
        // @ts-ignore
        const implContract: Implementation =
            await ImplementationContract.deploy(
                initialPrice,
                initialMinTokenAmount,
                initialFeePercentage,
            );
        const tokenAddress = await implContract.getAddress();

        const VestingContract: ContractFactory<any[], Contract> =
            await ethers.getContractFactory('VestingBasic');
        // @ts-ignore
        const vestingBasic: VestingBasic =
            await VestingContract.deploy(tokenAddress);
        const vestingAddress = await vestingBasic.getAddress();

        return {
            vestingBasic,
            implContract,
            vestingAddress,
            owner,
            tempAddress: tokenAddress,
            defaultUser,
        };
    }

    describe('deploy', () => {
        it('Should set right token and owner address', async () => {
            const { vestingBasic, owner, tempAddress } = await deploy();
            expect(await vestingBasic.token()).to.equal(tempAddress);
            expect(await vestingBasic.owner()).to.equal(owner.address);
        });
    });

    describe('vestTokensMany', () => {
        it('Should fail if called not by owner', async () => {
            const { vestingBasic, defaultUser } = await deploy();
            await expect(
                vestingBasic.connect(defaultUser).vestTokensMany([], []),
            ).to.revertedWith('not owner');
        });

        it('Should set correct amount to addresses', async () => {
            const { vestingBasic, defaultUser } = await deploy();
            const address = defaultUser.address;
            const amount = 10;

            await vestingBasic.vestTokensMany([address], [amount]);
            expect(await vestingBasic.claimableAmount(address)).to.equal(
                amount,
            );
        });

        // it('Should set 10 000 addresses', async () => {
        //     const { vestingBasic } = await deploy();
        //     console.log(addresses);
        //     console.log(amounts);
        //     await vestingBasic.vestTokensMany(addresses, amounts);
        // });
    });

    describe('claim', () => {
        it('Should revert', async () => {
            const { vestingBasic, defaultUser } = await deploy();
            await expect(
                vestingBasic.connect(defaultUser).claim(10),
            ).to.revertedWith('cannot claim');
        });

        it('Should decrease claimableAmount and contract balance', async () => {
            const { vestingBasic, implContract, vestingAddress, defaultUser } =
                await deploy();
            const userAddress = defaultUser.address;
            const initialAmount = 10;
            const claimAmount = 5;
            const contractBalance = 20;

            await implContract.buy(20, { value: 20 });
            await implContract.transfer(vestingAddress, contractBalance);

            await vestingBasic.vestTokensMany([userAddress], [initialAmount]);
            await vestingBasic.connect(defaultUser).claim(claimAmount);

            expect(
                await vestingBasic
                    .connect(defaultUser)
                    .claimableAmount(userAddress),
            ).to.equal(initialAmount - claimAmount);
            expect(await implContract.balances(vestingAddress)).to.equal(
                contractBalance - claimAmount,
            );
        });
    });
});
