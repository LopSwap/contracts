/*
 * Adapted from @1inch/limit-order-protocol-contract v4.0.3:
 * https://github.com/1inch/limit-order-protocol/blob/master/test/helpers/orderUtils.js
 *
 * MIT License
 *
 * Copyright (c) 2019 1inch. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { ZeroAddress, keccak256, solidityPacked } from 'ethers';

const EIP712_DOMAIN_NAME = '1inch Aggregation Router';
const EIP712_DOMAIN_VERSION = '6';

const ORDER_TYPES = [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'receiver', type: 'address' },
    { name: 'makerAsset', type: 'address' },
    { name: 'takerAsset', type: 'address' },
    { name: 'makingAmount', type: 'uint256' },
    { name: 'takingAmount', type: 'uint256' },
    { name: 'makerTraits', type: 'uint256' },
];

const NO_PARTIAL_FILLS_FLAG = 255n;
const ALLOW_MULTIPLE_FILLS_FLAG = 254n;
const NEED_PREINTERACTION_FLAG = 252n;
const NEED_POSTINTERACTION_FLAG = 251n;
const NEED_EPOCH_CHECK_FLAG = 250n;
const HAS_EXTENSION_FLAG = 249n;
const USE_PERMIT2_FLAG = 248n;
const UNWRAP_WETH_FLAG = 247n;

const TAKER_MAKER_AMOUNT_FLAG = 1n << 255n;
const TAKER_UNWRAP_WETH_FLAG = 1n << 254n;
const TAKER_SKIP_ORDER_PERMIT_FLAG = 1n << 253n;
const TAKER_USE_PERMIT2_FLAG = 1n << 252n;
const TAKER_ARGS_HAS_TARGET = 1n << 251n;
const TAKER_EXTENSION_LENGTH_OFFSET = 224n;
const TAKER_INTERACTION_LENGTH_OFFSET = 200n;

const trim0x = (value) => value.toString().replace(/^0x/, '');

function setBit(value, bit, enabled) {
    return enabled ? BigInt(value) | (1n << bit) : BigInt(value) & ~(1n << bit);
}

function assertUint40(value, name) {
    const bigintValue = BigInt(value);
    if (bigintValue < 0n || bigintValue >= 1n << 40n) {
        throw new Error(`${name} should be less than 40 bits`);
    }
}

function buildTakerTraits({
    makingAmount = false,
    unwrapWeth = false,
    skipMakerPermit = false,
    usePermit2 = false,
    target = '0x',
    extension = '0x',
    interaction = '0x',
    threshold = 0n,
} = {}) {
    const targetLength = trim0x(target).length;
    const extensionLength = trim0x(extension).length / 2;
    const interactionLength = trim0x(interaction).length / 2;

    return {
        traits:
            BigInt(threshold) |
            (makingAmount ? TAKER_MAKER_AMOUNT_FLAG : 0n) |
            (unwrapWeth ? TAKER_UNWRAP_WETH_FLAG : 0n) |
            (skipMakerPermit ? TAKER_SKIP_ORDER_PERMIT_FLAG : 0n) |
            (usePermit2 ? TAKER_USE_PERMIT2_FLAG : 0n) |
            (targetLength > 0 ? TAKER_ARGS_HAS_TARGET : 0n) |
            (BigInt(extensionLength) << TAKER_EXTENSION_LENGTH_OFFSET) |
            (BigInt(interactionLength) << TAKER_INTERACTION_LENGTH_OFFSET),
        args: solidityPacked(['bytes', 'bytes', 'bytes'], [target, extension, interaction]),
    };
}

function buildMakerTraits({
    allowedSender = ZeroAddress,
    shouldCheckEpoch = false,
    allowPartialFill = true,
    allowMultipleFills = true,
    usePermit2 = false,
    unwrapWeth = false,
    expiry = 0,
    nonce = 0,
    series = 0,
} = {}) {
    assertUint40(expiry, 'Expiry');
    assertUint40(nonce, 'Nonce');
    assertUint40(series, 'Series');

    const traits =
        (BigInt(series) << 160n) |
        (BigInt(nonce) << 120n) |
        (BigInt(expiry) << 80n) |
        (BigInt(allowedSender) & ((1n << 80n) - 1n)) |
        setBit(0n, UNWRAP_WETH_FLAG, unwrapWeth) |
        setBit(0n, ALLOW_MULTIPLE_FILLS_FLAG, allowMultipleFills) |
        setBit(0n, NO_PARTIAL_FILLS_FLAG, !allowPartialFill) |
        setBit(0n, NEED_EPOCH_CHECK_FLAG, shouldCheckEpoch) |
        setBit(0n, USE_PERMIT2_FLAG, usePermit2);

    return `0x${traits.toString(16).padStart(64, '0')}`;
}

function buildOrder(
    { maker, receiver = ZeroAddress, makerAsset, takerAsset, makingAmount, takingAmount, makerTraits = buildMakerTraits() },
    {
        makerAssetSuffix = '0x',
        takerAssetSuffix = '0x',
        makingAmountData = '0x',
        takingAmountData = '0x',
        predicate = '0x',
        permit = '0x',
        preInteraction = '0x',
        postInteraction = '0x',
        customData = '0x',
    } = {},
) {
    const interactions = [makerAssetSuffix, takerAssetSuffix, makingAmountData, takingAmountData, predicate, permit, preInteraction, postInteraction];

    let cumulativeLength = 0;
    const offsets = interactions.reduce((result, interaction, index) => {
        cumulativeLength += trim0x(interaction).length / 2;
        return result | (BigInt(cumulativeLength) << BigInt(32 * index));
    }, 0n);

    const interactionsData = interactions.map(trim0x).join('') + trim0x(customData);
    const extension = interactionsData.length > 0 ? `0x${offsets.toString(16).padStart(64, '0')}${interactionsData}` : '0x';

    let salt = '1';
    if (trim0x(extension).length > 0) {
        salt = BigInt(keccak256(extension)) & ((1n << 160n) - 1n);
        makerTraits = BigInt(makerTraits) | (1n << HAS_EXTENSION_FLAG);
    }

    if (trim0x(preInteraction).length > 0) {
        makerTraits = BigInt(makerTraits) | (1n << NEED_PREINTERACTION_FLAG);
    }

    if (trim0x(postInteraction).length > 0) {
        makerTraits = BigInt(makerTraits) | (1n << NEED_POSTINTERACTION_FLAG);
    }

    return {
        salt,
        maker,
        receiver,
        makerAsset,
        takerAsset,
        makingAmount,
        takingAmount,
        makerTraits,
        extension,
    };
}

async function signOrder(order, chainId, verifyingContract, wallet) {
    return wallet.signTypedData(
        {
            name: EIP712_DOMAIN_NAME,
            version: EIP712_DOMAIN_VERSION,
            chainId,
            verifyingContract,
        },
        { Order: ORDER_TYPES },
        order,
    );
}

export { buildMakerTraits, buildOrder, buildTakerTraits, signOrder };
