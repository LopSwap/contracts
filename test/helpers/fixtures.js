import { constants, deployContract, ethers, getAccountsWithCode, trackReceivedTokenAndTx } from '@1inch/solidity-utils';
import { deployTokens } from './deploy.js';
import { createPool, PoolType } from './orders.js';

const LIMIT_ORDER_PROTOCOL = '0x111111125421cA6dc452d289314280a0f8842A65';
const ERC20_TRUE = '0xDA0000d4000015A526378bB6faFc650Cea5966F8';
const INIT_MINT_AMOUNT = '1000';

async function initContracts() {
    const [alice, bob, charlie, owner] = await getAccountsWithCode();
    const chainId = (await ethers.provider.getNetwork()).chainId;

    // Deploy contracts
    const tokens = await deployTokens();
    const lopswapMap = {};
    lopswapMap[PoolType.SIMPLE_AMM] = await deployContract('SimpleAMMPool', [LIMIT_ORDER_PROTOCOL, owner]);
    lopswapMap[PoolType.VIRTUAL_AMM] = await deployContract('VirtualAMMPool', [LIMIT_ORDER_PROTOCOL, owner]);
    lopswapMap[PoolType.FLASHLOAN] = await deployContract('FlashLoanPool', [LIMIT_ORDER_PROTOCOL, owner]);
    const inch = await ethers.getContractAt('IOrderMixin', LIMIT_ORDER_PROTOCOL);

    // Set up tokens
    for (const token of Object.values(tokens)) {
        // Skip ETH
        if (token.target === constants.ZERO_ADDRESS) {
            continue;
        }
        // Mint token and approve 1inch limit order protocol
        await token.mint(alice.address, token.parseAmount(INIT_MINT_AMOUNT));
        await token.mint(bob.address, token.parseAmount(INIT_MINT_AMOUNT));
        await token.connect(alice).approve(LIMIT_ORDER_PROTOCOL, token.parseAmount(INIT_MINT_AMOUNT));
        await token.connect(bob).approve(LIMIT_ORDER_PROTOCOL, token.parseAmount(INIT_MINT_AMOUNT));
        await token.connect(bob).approve(lopswapMap[PoolType.FLASHLOAN], constants.MAX_UINT256);
    }

    return {
        accounts: { alice, bob, charlie, owner },
        chainId,
        tokens,
        lopswapMap,
        inch,
    };
}

async function initContractsAndPreparePool({
    typeOfOrder = PoolType.SIMPLE_AMM,
    providerFee = 1000n,
    protocolFee = 0n,
    protocolFeeReceiver = '',
    providerFeeReceiver = '',
} = {}) {
    const fixtureData = await initContracts();
    const {
        accounts: { alice, owner },
        chainId,
        tokens,
        lopswapMap,
    } = fixtureData;
    const lopswap = lopswapMap[typeOfOrder];

    const assetALiquidity = tokens.MKR.parseAmount('10');
    const assetBLiquidity = tokens.TKR.parseAmount('15');
    const lopapool = await createPool(lopswap, chainId, LIMIT_ORDER_PROTOCOL, {
        maker: alice,
        assetA: await tokens.MKR.getAddress(),
        assetB: typeOfOrder === PoolType.FLASHLOAN ? ERC20_TRUE : await tokens.TKR.getAddress(),
        assetALiquidity,
        assetBLiquidity,
        providerFee,
        providerFeeReceiver,
    });
    lopapool.id = await lopswap.getPool(lopapool.AB.order);
    const baseFee = await lopswap.FEE_BASE();

    if (protocolFeeReceiver === '') {
        protocolFeeReceiver = owner.address;
    }
    await lopswap.connect(owner).setProtocolFee(protocolFee, protocolFeeReceiver);

    return { ...fixtureData, lopswap, lopapool, baseFee };
}

async function initContractsWithInitPool({ typeOfOrder = PoolType.SIMPLE_AMM, providerFee = 1000n, protocolFee = 0n, protocolFeeReceiver = '' } = {}) {
    const fixtureData = await initContractsAndPreparePool({
        typeOfOrder,
        providerFee,
        protocolFee,
        protocolFeeReceiver,
    });
    const {
        accounts: { bob },
        tokens,
        inch,
        lopapool,
        baseFee,
    } = fixtureData;
    // Make swap to initialize pool in contract
    const initSwapAmount = tokens.TKR.parseAmount('0.1');
    const pool = lopapool.AB;
    const fill = () =>
        inch
            .connect(bob)
            .fillOrderArgs(
                pool.order,
                pool.signature.r,
                pool.signature.vs,
                initSwapAmount,
                pool.takerTraitsForTakingAmount.traits,
                pool.takerTraitsForTakingAmount.args,
            );
    const [receivedMKR] = await trackReceivedTokenAndTx(ethers.provider, tokens.MKR, bob.address, fill);
    const makerAssetAmount = constants.MAX_UINT256 - pool.order.makingAmount - receivedMKR;
    const takerAssetAmount = constants.MAX_UINT256 - pool.order.takingAmount + (initSwapAmount * (baseFee - providerFee - protocolFee)) / baseFee;
    return {
        ...fixtureData,
        initBalances: {
            AB: { makerAssetAmount, takerAssetAmount },
            BA: { makerAssetAmount: takerAssetAmount, takerAssetAmount: makerAssetAmount },
        },
    };
}

async function initRecursiveMatcher() {
    return await deployContract('RecursiveMatcher');
}

export { initContracts, initContractsAndPreparePool, initContractsWithInitPool, initRecursiveMatcher };
