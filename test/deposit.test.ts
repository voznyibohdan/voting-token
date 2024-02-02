import { ethers } from 'hardhat';
import { RaffleImplementationV1 } from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import ERC20ABI from './helpers/erc20.json';

describe('Raffle deposit', () => {
    const DAIAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    const WETHAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const MyAddress = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
    // const DAIHolder = '0x5d38b4e4783e34e2301a2a36c39a03c45798c4dd';
    const SWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

    async function deploy() {
        const [owner, user1]: HardhatEthersSigner[] = await ethers.getSigners();
        const Contract = await ethers.getContractFactory('RaffleImplementationV1');
        //@ts-ignore
        const contract: RaffleImplementationV1 = await Contract.deploy(SWAP_ROUTER);
        const contractAddress = await contract.getAddress();

        return { contract, contractAddress, owner, user1 };
    }

    describe('deposit', () => {
        it('Should deposit', async () => {
            const { contract } = await deploy();

            await contract.addAllowedToken(DAIAddress);

            const impersonateSigner = await ethers.getSigner('0x6B175474E89094C44Da98b954EedeAC495271d0F');
            console.log(impersonateSigner.address);

            const DAIContract = new ethers.Contract(DAIAddress, ERC20ABI, impersonateSigner);
            const DAIHolderBalance = await DAIContract.balanceOf(impersonateSigner.address);
            console.log('DAIHolderBalance: ', DAIHolderBalance);

            const WETHContract = new ethers.Contract(WETHAddress, ERC20ABI, impersonateSigner);
            const myBalance = await WETHContract.balanceOf(MyAddress);
            console.log('myBalance: ', myBalance);

            // await WETHContract.approve(user1.address, myBalance);

            await contract.connect(impersonateSigner).swap(DAIAddress, WETHAddress, 10000, MyAddress);
            // const amountOut = await contract.deposit(DAIAddress, 10);
            // console.log(amountOut);
        });
    });
});
