import { constants, ethers, trim0x } from '@1inch/solidity-utils';
import { buildMakerTraits, buildOrder, buildTakerTraits, signOrder } from './1inch/orderUtils.js';

const PoolType = {
    SIMPLE_AMM: 'simpleAmm',
    VIRTUAL_AMM: 'virtualAmm',
    FLASHLOAN: 'flashloan',
};

const PoolStatus = {
    NEW: 0n,
    INITIALIZED: 1n,
    INVALIDATED: 2n,
};

const DEFAULT_PROTOCOL_FEE_RECEIVER = constants.ZERO_ADDRESS.slice(0, -1) + '1';
const DEFAULT_PROVIDER_FEE_RECEIVER = constants.ZERO_ADDRESS.slice(0, -1) + '2';

async function createOrder(
    lopswap,
    chainId,
    lopAddress,
    {
        maker,
        makerAsset, // address
        takerAsset, // address
        makerAssetLiquidity,
        takerAssetLiquidity,
        providerFee,
        salt = 0n,
        providerFeeReceiver = maker.address,
    },
) {
    if (BigInt(providerFee) > 65535n) throw new Error('The `providerFee` value must fit within 2 bytes (16 bits)');
    if (BigInt(salt) > BigInt(2 ** 72)) throw new Error('The `salt` value must fit within 72 bits');

    const order = buildOrder(
        {
            maker: maker.address,
            receiver: await lopswap.getAddress(),
            makerAsset,
            takerAsset,
            makingAmount: constants.MAX_UINT256 - makerAssetLiquidity,
            takingAmount: constants.MAX_UINT256 - takerAssetLiquidity,
            makerTraits: buildMakerTraits(),
        },
        {
            preInteraction: lopswap.target,
            postInteraction: lopswap.target + (providerFeeReceiver === maker.address ? '' : trim0x(providerFeeReceiver)),
            makingAmountData: lopswap.target,
            takingAmountData: lopswap.target,
        },
    );
    const bitmap = (providerFeeReceiver === maker.address ? BigInt(1n) : BigInt(0n)) << 7n;
    order.salt = (BigInt(bitmap) << 248n) | (BigInt(providerFee) << 232n) | (BigInt(salt) << 160n) | (order.salt & ((1n << 160n) - 1n));
    const { r, yParityAndS: vs } = ethers.Signature.from(await signOrder(order, chainId, lopAddress, maker));
    return { order, signature: { r, vs } };
}

async function createPool(
    lopswap,
    chainId,
    lopAddress,
    {
        maker,
        assetA, // address
        assetB, // address
        assetALiquidity,
        assetBLiquidity,
        providerFee,
        salt = 0n,
        providerFeeReceiver = '',
    },
) {
    // AB: assetA is makerAsset, assetB is takerAsset
    // BA: assetB is makerAsset, assetA is takerAsset
    const loopapool = { AB: null, BA: null };

    // Build and sign order where `assetA` is makerAsset and `assetB` is takerAsset
    let data = await createOrder(lopswap, chainId, lopAddress, {
        maker,
        providerFee,
        salt,
        providerFeeReceiver,
        makerAsset: assetA,
        takerAsset: assetB,
        makerAssetLiquidity: assetALiquidity,
        takerAssetLiquidity: assetBLiquidity,
    });
    loopapool.AB = {
        ...data,
        takerTraitsForTakingAmount: buildTakerTraits({
            makingAmount: false,
            extension: data.order.extension,
        }),
        takerTraitsForMakingAmount: buildTakerTraits({
            makingAmount: true,
            extension: data.order.extension,
        }),
    };

    // Build and sign order where `assetB` is makerAsset and `assetA` is takerAsset
    data = await createOrder(lopswap, chainId, lopAddress, {
        maker,
        providerFee,
        salt,
        providerFeeReceiver,
        makerAsset: assetB,
        takerAsset: assetA,
        makerAssetLiquidity: assetBLiquidity,
        takerAssetLiquidity: assetALiquidity,
    });
    loopapool.BA = {
        ...data,
        takerTraitsForTakingAmount: buildTakerTraits({
            makingAmount: false,
            extension: data.order.extension,
        }),
        takerTraitsForMakingAmount: buildTakerTraits({
            makingAmount: true,
            extension: data.order.extension,
        }),
    };

    return loopapool;
}

function getProviderFee(order) {
    return (order.salt >> 232n) & 0xffffn;
}

export { PoolStatus, PoolType, DEFAULT_PROTOCOL_FEE_RECEIVER, DEFAULT_PROVIDER_FEE_RECEIVER, buildTakerTraits, createPool, getProviderFee };
