import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-gas-reporter';
import '@nomicfoundation/hardhat-ethers';

dotenv.config();

const REPORT_GAS = process.env.REPORT_GAS === 'true';

const config: HardhatUserConfig = {
    solidity: '0.8.20',
    networks: {
        hardhat: {
            blockGasLimit: 10000000,
            allowUnlimitedContractSize: true,
        },
    },
    gasReporter: {
        enabled: REPORT_GAS,
        currency: 'USD',
        outputFile: 'gas-report.txt',
    },
};

export default config;
