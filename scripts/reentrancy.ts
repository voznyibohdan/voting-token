import { ethers } from 'hardhat';

async function main() {
    const reentrancyContract = await ethers.deployContract('Reentrancy');
    await reentrancyContract.waitForDeployment();
    await reentrancyContract.deposit({ value: ethers.parseEther('9') });

    const attackContract = await ethers.deployContract('ReentrancyAttack', [
        await reentrancyContract.getAddress(),
    ]);
    await attackContract.waitForDeployment();

    await attackContract.depos({ value: ethers.parseEther('1') });
    await attackContract.attack();

    const stolenBalance = await attackContract.stolenBalance(
        await attackContract.getAddress(),
    );
    console.log('stolen balance: ', stolenBalance);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
