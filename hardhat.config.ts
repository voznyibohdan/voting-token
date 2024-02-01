import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-gas-reporter';
import '@nomicfoundation/hardhat-ethers';
import '@nomiclabs/hardhat-web3';
import "@nomicfoundation/hardhat-toolbox";

dotenv.config();

const REPORT_GAS = process.env.REPORT_GAS === 'true';

const config: HardhatUserConfig = {
    solidity: '0.8.20',
    networks: {
        sepolia: {
            url: `${process.env.ALCHEMY_SEPOLIA_URL}`,
            accounts: [`0x${process.env.SEPOLIA_PRIVATE_KEY}`],
        },
        hardhat: {
            blockGasLimit: 200_000_000,
            allowUnlimitedContractSize: true,
            forking: {
                url: process.env.MAINNET_HTTP as string,
            },
        },
    },
    gasReporter: {
        enabled: REPORT_GAS,
        currency: 'USD',
        outputFile: 'gas-report.txt',
    },
};

export default config;
