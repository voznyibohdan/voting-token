import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { Implementation, VestingAuthorizing } from '../typechain-types';
import { Contract, ContractFactory } from 'ethers';

describe('', () => {
    async function deploy() {
        const [owner, to]: HardhatEthersSigner[] = await ethers.getSigners();

        const ImplementationContract = await ethers.getContractFactory('Implementation');
        // @ts-ignore
        const implContract: Implementation = await ImplementationContract.deploy(1, 5, 5);
        const tokenAddress = await implContract.getAddress();

        const VestingContract: ContractFactory<any[], Contract> = await ethers.getContractFactory('VestingAuthorizing');
        // @ts-ignore
        const vestingAuthorization: VestingAuthorizing = await VestingContract.deploy(tokenAddress);
        const vestingAddress = await vestingAuthorization.getAddress();

        const messageHash = await vestingAuthorization.getMessageHash(to.address, 10, 1);
        // const ethSignedMessageHash = await vestingAuthorization.getEthSignedMessageHash(messageHash);

        const signature = await owner.signMessage(messageHash);

        return {
            vestingAuthorization,
            to,
            signature,
            vestingAddress
        };
    }

    describe('canClaim', () => {
        it('Users should be able to claim tokens', async () => {
            const {vestingAuthorization, to,signature } = await deploy();
            await vestingAuthorization.connect(to).canClaim(to.address, 10, 1, signature.slice(0, 65));
        });
    });
});
