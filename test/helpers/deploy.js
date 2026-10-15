import { constants, deployContract, ethers } from '@1inch/solidity-utils';
import { formatUnits, parseUnits } from 'ethers';

async function deployTokens() {
    // Init tokens
    const tokens = {
        ETH: {
            target: constants.ZERO_ADDRESS,
            async getAddress() {
                return this.target;
            },
            decimals: () => 18,
        },
        MKR: await deployContract('TokenCustomDecimalsMock', ['MakerToken', 'MKR', 0, 18]),
        TKR: await deployContract('TokenCustomDecimalsMock', ['TakerToken', 'TKR', 0, 6]),
        AAA: await deployContract('TokenCustomDecimalsMock', ['TempTestToken', 'AAA', 0, 18]),
    };

    // Add parseAmount() and formatAmount() methods to each token
    for (const token of Object.values(tokens)) {
        const metadata = 'decimals' in token ? token : await ethers.getContractAt('IERC20Metadata', token);
        const tokenDecimals = await metadata.decimals();
        token.parseAmount = (value) => parseUnits(value, tokenDecimals);
        token.formatAmount = (value) => formatUnits(value, tokenDecimals);
    }

    return tokens;
}

export { deployTokens };
