import { deployAndGetContractWithCreate3 } from '@1inch/solidity-utils';

const LIMIT_ORDER_PROTOCOL = '0x111111125421cA6dc452d289314280a0f8842A65';
const CREATE3_DEPLOYER = '0x03bC3933B931BDcb20AB8bb172c2be009B92aF8e';
const SALT = '0xc043c724ceee86fef34a7c556f1bdd5a704f1b54f5906626b9f733e89a610777';

const deployFlashLoanPool = async (env) => {
    const { extra, name } = env;
    const { ethers } = extra.connection;
    console.log(`running FlashLoanPool deploy script on ${name}`);

    const [deployerSigner] = await ethers.getSigners();
    const owner = await deployerSigner.getAddress();

    await deployAndGetContractWithCreate3({
        contractName: 'FlashLoanPool',
        constructorArgs: [LIMIT_ORDER_PROTOCOL, owner],
        create3Deployer: CREATE3_DEPLOYER,
        salt: SALT,
        env,
        txSigner: deployerSigner,
    });
};

export default deployFlashLoanPool;
