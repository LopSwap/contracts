import { deployAndGetContractWithCreate3 } from '@1inch/solidity-utils';

const LIMIT_ORDER_PROTOCOL = '0x111111125421cA6dc452d289314280a0f8842A65';
const CREATE3_DEPLOYER = '0x03bC3933B931BDcb20AB8bb172c2be009B92aF8e';
const SALT = '0xa283bff3eaaae9e55744c9387ccc225e0e474ba007ad08f4a5d9efe64ca63dac';

const deploySimpleAMMPool = async (env) => {
    const { extra, name } = env;
    const { ethers } = extra.connection;
    console.log(`running SimpleAMMPool deploy script on ${name}`);

    const [deployerSigner] = await ethers.getSigners();
    const owner = await deployerSigner.getAddress();

    await deployAndGetContractWithCreate3({
        contractName: 'SimpleAMMPool',
        constructorArgs: [LIMIT_ORDER_PROTOCOL, owner],
        create3Deployer: CREATE3_DEPLOYER,
        salt: SALT,
        env,
        txSigner: deployerSigner,
    });
};

export default deploySimpleAMMPool;
