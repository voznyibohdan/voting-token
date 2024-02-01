import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { RaffleImplementationV1 } from '../typechain-types';
import { expect } from 'chai';

describe('Ruffle implementation v1', () => {
    const bnbChainMainnet = '0x404460C6A5EdE2D891e8297795264fDe62ADBB75';
    const sepoliaTestnet = '0x779877A7B0D9E8603169DdbD7836e478b4624789';

    async function deploy() {
        const [owner, user]: HardhatEthersSigner[] = await ethers.getSigners();

        const swapRouter = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

        const Contract = await ethers.getContractFactory('RaffleImplementationV1');
        //@ts-ignore
        // contract address 0xE04Fe2e71242f937aE85ba60998871A388413FDA
        const contract: RaffleImplementationV1 = await Contract.deploy(swapRouter);

        return { contract, owner, user };
    }

    describe('addAllowedToken', () => {
        it('Should add token to allowed tokens list', async () => {
            const { contract } = await deploy();
            await contract.addAllowedToken(sepoliaTestnet);

            expect(await contract.allowedTokens(sepoliaTestnet)).to.equal(true);
        });
    });

    describe('removeAllowedToken', () => {
        it('Should remove token to allowed tokens list', async () => {
            const { contract } = await deploy();
            await contract.addAllowedToken(sepoliaTestnet);
            await contract.removeAllowedToken(sepoliaTestnet);

            expect(await contract.allowedTokens(sepoliaTestnet)).to.equal(false);
        });
    });

    describe('getLatestTokenPrice', () => {
        it('Should revert if token not allowed', async () => {
            const { contract } = await deploy();
            await expect(contract.getLatestTokenPrice(bnbChainMainnet)).to.revertedWith('Token not allowed');
        });

        it('Should return token price', async () => {
            try {
                const { contract } = await deploy();
                await contract.addAllowedToken(bnbChainMainnet);
                const price = await contract.getLatestTokenPrice(bnbChainMainnet);
                console.log('price: ', price);
            } catch (error) {
                console.log(error);
            }
        });
    });

    describe('generateRandomNumber', () => {
        it('Should return random number', async () => {
            const { contract } = await deploy();
            const maxNumber = 95;

            expect(await contract.generateRandomNumber(maxNumber)).to.be.lessThan(maxNumber + 1);
        });
    });
});
