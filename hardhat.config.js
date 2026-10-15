import hardhatDeploy from 'hardhat-deploy';
import hardhatEthers from '@nomicfoundation/hardhat-ethers';
import hardhatEthersChaiMatchers from '@nomicfoundation/hardhat-ethers-chai-matchers';
import hardhatMocha from '@nomicfoundation/hardhat-mocha';
import hardhatNetworkHelpers from '@nomicfoundation/hardhat-network-helpers';
import hardhatVerify from '@nomicfoundation/hardhat-verify';
import { defineConfig } from 'hardhat/config';

import { Networks } from '@1inch/solidity-utils/hardhat-setup';
import { docgenConfig } from './docgen.config.js';

const isParallel = process.env.HARDHAT_MODE?.toLowerCase() === 'parallel';
const isCoverage = process.env.HARDHAT_MODE?.toLowerCase() === 'coverage';

const { networks, etherscan } = new Networks(true, 'mainnet').registerAll();
networks.hardhat = { ...networks.default };

const compilers = [
    {
        version: '0.8.26',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000000,
            },
            evmVersion: 'cancun',
            viaIR: true,
        },
    },
    {
        version: '0.8.23', // for @1inch/limit-order-protocol contracts
        settings: {
            optimizer: { enabled: true, runs: 200 },
        },
    },
];

const extConfig = {
    ...(isParallel ? { test: { mocha: { parallel: true } } } : {}),
    ...(isCoverage ? { paths: { tests: { mocha: 'test', solidity: 'contracts/mocks' } } } : {}),
};

export default defineConfig({
    plugins: [hardhatDeploy, hardhatEthers, hardhatEthersChaiMatchers, hardhatMocha, hardhatNetworkHelpers, hardhatVerify],
    solidity: {
        profiles: {
            default: { compilers },
            production: { compilers },
        },
        npmFilesToBuild: [
            '@1inch/solidity-utils/contracts/interfaces/ICreate3Deployer.sol',
            '@1inch/solidity-utils/contracts/mocks/TokenCustomDecimalsMock.sol',
            '@1inch/limit-order-protocol-contract/contracts/mocks/RecursiveMatcher.sol',
            '@1inch/limit-order-protocol-contract/contracts/interfaces/IOrderMixin.sol',
        ],
    },
    ...extConfig,
    networks,
    verify: {
        etherscan,
    },
    tracer: {
        enableAllOpcodes: false,
    },
    docgen: docgenConfig,
});
