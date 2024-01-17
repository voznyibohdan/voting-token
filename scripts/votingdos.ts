import { ethers } from 'hardhat';

async function main() {
    const votingDosContract = await ethers.deployContract('DOS');
    await votingDosContract.waitForDeployment();

    await votingDosContract.vote(ethers.Wallet.createRandom().address);
    await votingDosContract.vote(ethers.Wallet.createRandom().address);
    await votingDosContract.vote(ethers.Wallet.createRandom().address);

    const gasLimit = 20000;
    await votingDosContract.endVoting({ gasLimit });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
