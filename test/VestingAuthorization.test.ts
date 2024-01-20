import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { Implementation, VestingAuthorizing } from '../typechain-types';
import { Contract, ContractFactory } from 'ethers';
import { expect } from 'chai';

describe('', () => {
    async function deploy() {
        const [signer, to]: HardhatEthersSigner[] = await ethers.getSigners();

        const ImplementationContract = await ethers.getContractFactory('Implementation');
        // @ts-ignore
        const implContract: Implementation = await ImplementationContract.deploy(1, 5, 5);
        const tokenAddress = await implContract.getAddress();

        const VestingContract: ContractFactory<any[], Contract> = await ethers.getContractFactory('VestingAuthorizing');
        // @ts-ignore
        const vestingAuthorization: VestingAuthorizing = await VestingContract.deploy(tokenAddress);
        const vestingAddress = await vestingAuthorization.getAddress();

        await implContract.buy(20, { value: 20 });
        await implContract.transfer(vestingAddress, 20);

        const amount = 10;
        const nonce = 123;
        const hash = await vestingAuthorization.getMessageHash(to.address, amount, nonce);
        const sig = await signer.signMessage(ethers.getBytes(hash));

        return { vestingAuthorization,implContract,tokenAddress, signer, to, amount, nonce, sig, vestingAddress };
    }

    describe('deploy', () => {
        it('Should set right token and owner address', async () => {
            const { vestingAuthorization, tokenAddress, signer } = await deploy();
            expect(await vestingAuthorization.owner()).to.equal(signer.address);
            expect(await vestingAuthorization.token()).to.equal(tokenAddress);
        });
    })

    describe('canClaim', () => {
        it('Should revert', async () => {
            const { vestingAuthorization, to, amount, nonce, sig } = await deploy();
            await vestingAuthorization.claimTokens(to.address, amount, nonce, sig);

            const wrongNonce = 124;
            await expect(vestingAuthorization.claimTokens(to.address, amount, nonce, sig)).to.revertedWith('nonce already used');
            await expect(vestingAuthorization.claimTokens(to.address, amount, wrongNonce, sig)).to.revertedWith('signature failed');
        });

        it('Users should be able to claim tokens', async () => {
            const { vestingAuthorization, implContract, to, amount, nonce, sig } = await deploy();
            await vestingAuthorization.claimTokens(to.address, amount, nonce, sig);

            expect(await implContract.balances(to.address)).to.equal(amount);
        });
    });
});
