import { expect } from 'chai';
// @ts-ignore
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { Implementation } from '../typechain-types';

describe('Proxy Contract', function () {
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    async function deploy() {
        const [owner, implementation, newImplementation] =
            await ethers.getSigners();

        const initialPrice = 1;
        const initialMinTokenAmount = 5;
        const initialFeePercentage = 5;

        const ImplementationContract =
            await ethers.getContractFactory('Implementation');
        const implContract: Implementation =
            await ImplementationContract.deploy(
                initialPrice,
                initialMinTokenAmount,
                initialFeePercentage,
            );

        const ProxyContract = await ethers.getContractFactory('Proxy');
        const proxyContract = await ProxyContract.deploy(
            implContract.getAddress(),
        );

        return {
            proxyContract,
            owner,
            implementation,
            newImplementation,
            implContract,
        };
    }

    async function deployWithZeroAddress() {
        const ProxyContract = await ethers.getContractFactory('Proxy');
        return await ProxyContract.deploy(zeroAddress);
    }

    describe('Deployment', () => {
        it('Should set the right owner', async () => {
            const { proxyContract, owner } = await loadFixture(deploy);
            expect(await proxyContract.owner()).to.equal(owner.address);
        });

        it('Should set the right implementation contract', async () => {
            const { proxyContract, implContract } = await loadFixture(deploy);
            expect(await proxyContract.implementation()).to.equal(implContract);
        });

        it('Should fail on zero address', async () => {
            // @ts-ignore
            await expect(deployWithZeroAddress()).to.be.revertedWith(
                'Zero address',
            );
        });
    });

    describe('Update implementation', () => {
        it('Should set new implementation', async () => {
            const { proxyContract, newImplementation } =
                await loadFixture(deploy);
            await proxyContract.updateImplementation(newImplementation.address);
            expect(await proxyContract.implementation()).to.equal(
                newImplementation.address,
            );
            // @ts-ignore
            await expect(
                proxyContract
                    .connect(newImplementation)
                    .updateImplementation(newImplementation.address),
            ).to.revertedWith('only owner');
        });

        it('Should fail on zero address', async () => {
            const { proxyContract } = await loadFixture(deploy);
            const updateImplementationWithZeroAddress = async () =>
                await proxyContract.updateImplementation(zeroAddress);
            // @ts-ignore
            await expect(
                updateImplementationWithZeroAddress(),
            ).to.be.revertedWith('Zero address');
        });
    });

    describe('fallback', () => {
        it('should', async () => {
            const { proxyContract, newImplementation } =
                await loadFixture(deploy);
            // @ts-ignore
            await proxyContract.balanceOf(newImplementation.address);
            expect(true).to.equal(true);
        });
    });
});
