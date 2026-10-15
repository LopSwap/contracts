import { ethers, expect, loadFixture } from '@1inch/solidity-utils';

import { initContractsAndPreparePool, initRecursiveMatcher } from './helpers/fixtures.js';
import { buildMakerTraits, buildOrder, signOrder } from './helpers/1inch/orderUtils.js';
import { DEFAULT_PROTOCOL_FEE_RECEIVER, PoolType, buildTakerTraits } from './helpers/orders.js';

describe('FlashLoanPool', async function () {
    const providerFee = 1000n; // 1%

    const initFlashLoan = () =>
        initContractsAndPreparePool({
            typeOfOrder: PoolType.FLASHLOAN,
            providerFee,
        });

    const initFlashLoanWithProtocolFee = () =>
        initContractsAndPreparePool({
            typeOfOrder: PoolType.FLASHLOAN,
            providerFee,
            protocolFee: 2000n, // 2%
            protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
        });

    it('should just fill without action and pay fee, fill by takingAmount', async function () {
        const {
            accounts: { alice, bob },
            tokens,
            lopswap,
            inch,
            lopapool,
            baseFee,
        } = await loadFixture(initFlashLoan);

        const swapAmount = tokens.TKR.parseAmount('2'); // in takerAsset
        const pool = lopapool.AB;

        for (let i = 0; i < 3; i++) {
            const balancesBefore = {
                pool: await lopswap.getBalances(pool.order),
                alice: await tokens.MKR.balanceOf(alice),
                bob: await tokens.MKR.balanceOf(bob),
            };
            await inch
                .connect(bob)
                .fillOrderArgs(
                    pool.order,
                    pool.signature.r,
                    pool.signature.vs,
                    swapAmount,
                    pool.takerTraitsForTakingAmount.traits,
                    pool.takerTraitsForTakingAmount.args,
                );
            const balancesAfter = {
                pool: await lopswap.getBalances(pool.order),
                alice: await tokens.MKR.balanceOf(alice),
                bob: await tokens.MKR.balanceOf(bob),
            };
            expect(balancesAfter.pool.makerAssetBalance).to.be.eq(balancesBefore.pool.makerAssetBalance);
            const fee = (swapAmount * providerFee) / baseFee;
            expect(balancesAfter.alice).to.be.eq(balancesBefore.alice + fee);
            expect(balancesAfter.bob).to.be.eq(balancesBefore.bob - fee);
        }
    });

    it('should just fill without action and pay fee, fill by makingAmount', async function () {
        const {
            accounts: { alice, bob },
            tokens,
            lopswap,
            inch,
            lopapool,
            baseFee,
        } = await loadFixture(initFlashLoan);

        const swapAmount = tokens.MKR.parseAmount('2'); // in makerAsset
        const pool = lopapool.AB;

        for (let i = 0; i < 3; i++) {
            const balancesBefore = {
                pool: await lopswap.getBalances(pool.order),
                alice: await tokens.MKR.balanceOf(alice),
                bob: await tokens.MKR.balanceOf(bob),
            };
            await inch
                .connect(bob)
                .fillOrderArgs(
                    pool.order,
                    pool.signature.r,
                    pool.signature.vs,
                    swapAmount,
                    pool.takerTraitsForMakingAmount.traits,
                    pool.takerTraitsForMakingAmount.args,
                );
            const balancesAfter = {
                pool: await lopswap.getBalances(pool.order),
                alice: await tokens.MKR.balanceOf(alice),
                bob: await tokens.MKR.balanceOf(bob),
            };
            expect(balancesAfter.pool.makerAssetBalance).to.be.eq(balancesBefore.pool.makerAssetBalance);
            const returnAmount = (swapAmount * baseFee) / (baseFee - providerFee);
            const fee = (returnAmount * providerFee) / baseFee;
            expect(balancesAfter.alice).to.be.eq(balancesBefore.alice + fee);
            expect(balancesAfter.bob).to.be.eq(balancesBefore.bob - fee);
        }
    });

    it('should pay protocol fee', async function () {
        const {
            accounts: { bob },
            tokens,
            lopswap,
            inch,
            lopapool,
            baseFee,
        } = await loadFixture(initFlashLoanWithProtocolFee);

        const swapAmount = tokens.TKR.parseAmount('2'); // in takerAsset
        const pool = lopapool.AB;
        const protocolFee = await lopswap.protocolFee();
        const tx = await inch
            .connect(bob)
            .fillOrderArgs(
                pool.order,
                pool.signature.r,
                pool.signature.vs,
                swapAmount,
                pool.takerTraitsForTakingAmount.traits,
                pool.takerTraitsForTakingAmount.args,
            );

        await expect(tx).to.be.changeTokenBalance(ethers, tokens.MKR, DEFAULT_PROTOCOL_FEE_RECEIVER, (swapAmount * protocolFee) / baseFee);
    });

    it('should revert if repayment does not cover makingAmount without fee', async function () {
        // This can only happen if the order has no takingAmount getter, so the repayment does not include the fee.
        const {
            accounts: { alice, bob },
            chainId,
            tokens,
            lopswap,
            inch,
            lopapool,
        } = await loadFixture(initFlashLoan);

        const pool = lopapool.AB;
        const amount = tokens.MKR.parseAmount('2');
        const orderAmount = tokens.MKR.parseAmount('10');
        const order = buildOrder(
            {
                maker: alice.address,
                receiver: await lopswap.getAddress(),
                makerAsset: pool.order.makerAsset,
                takerAsset: pool.order.takerAsset,
                makingAmount: orderAmount,
                takingAmount: orderAmount,
                makerTraits: buildMakerTraits(),
            },
            {
                preInteraction: await lopswap.getAddress(),
                postInteraction: await lopswap.getAddress(),
            },
        );
        order.salt = BigInt(order.salt) | (1n << 255n) | (providerFee << 232n);
        const { r, yParityAndS: vs } = ethers.Signature.from(await signOrder(order, chainId, await inch.getAddress(), alice));
        const takerTraits = buildTakerTraits({
            makingAmount: true,
            extension: order.extension,
        });

        const tx = inch.connect(bob).fillOrderArgs(order, r, vs, amount, takerTraits.traits, takerTraits.args);
        await expect(tx).to.be.revertedWithCustomError(lopswap, 'InsufficientRepayment');
    });

    it('should revert if insufficient funds for repayment, fill by takingAmount', async function () {
        const {
            accounts: { bob },
            tokens,
            lopswap,
            inch,
            lopapool,
        } = await loadFixture(initFlashLoan);

        const swapAmount = tokens.TKR.parseAmount('2'); // in takerAsset
        const pool = lopapool.AB;

        const loanAmount = await lopswap.getReturnMakingAmount(pool.order, swapAmount);
        await tokens.MKR.connect(bob).approve(lopswap, loanAmount - 1n);

        const tx = async () =>
            inch
                .connect(bob)
                .fillOrderArgs(
                    pool.order,
                    pool.signature.r,
                    pool.signature.vs,
                    swapAmount,
                    pool.takerTraitsForTakingAmount.traits,
                    pool.takerTraitsForTakingAmount.args,
                );
        await expect(tx()).to.be.revertedWithCustomError(lopswap, 'SafeTransferFromFailed');
    });

    it('should revert if insufficient funds for repayment, fill by makingAmount', async function () {
        const {
            accounts: { bob },
            tokens,
            lopswap,
            inch,
            lopapool,
        } = await loadFixture(initFlashLoan);

        const swapAmount = tokens.MKR.parseAmount('2'); // in makerAsset
        const pool = lopapool.AB;

        await tokens.MKR.connect(bob).approve(lopswap, swapAmount - 1n);

        const tx = async () =>
            inch
                .connect(bob)
                .fillOrderArgs(
                    pool.order,
                    pool.signature.r,
                    pool.signature.vs,
                    swapAmount,
                    pool.takerTraitsForMakingAmount.traits,
                    pool.takerTraitsForMakingAmount.args,
                );
        await expect(tx()).to.be.revertedWithCustomError(lopswap, 'SafeTransferFromFailed');
    });

    it('should revert if loan more then pool balance', async function () {
        const {
            accounts: { bob },
            lopswap,
            inch,
            lopapool,
        } = await loadFixture(initFlashLoan);

        const pool = lopapool.AB;
        const poolBalance = (await lopswap.getBalances(pool.order)).makerAssetBalance;

        const tx = async () =>
            inch
                .connect(bob)
                .fillOrderArgs(
                    pool.order,
                    pool.signature.r,
                    pool.signature.vs,
                    poolBalance + 1n,
                    pool.takerTraitsForMakingAmount.traits,
                    pool.takerTraitsForMakingAmount.args,
                );
        await expect(tx()).to.be.revertedWithCustomError(lopswap, 'NotEnoughLiquidity');
    });

    it('should revert if recursive loan more then pool balance', async function () {
        const { lopswap, inch, lopapool } = await loadFixture(initFlashLoan);
        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        const matcher = await initRecursiveMatcher();

        const pool = lopapool.AB;
        const poolBalance = (await lopswap.getBalances(pool.order)).makerAssetBalance;

        const matchingParams =
            (await matcher.getAddress()) +
            '01' +
            abiCoder
                .encode(
                    ['address[]', 'bytes[]'],
                    [
                        [await inch.getAddress()],
                        [
                            inch.interface.encodeFunctionData('fillOrderArgs', [
                                pool.order,
                                pool.signature.r,
                                pool.signature.vs,
                                1n, // extra makingAmount in recursive call after flashloan for poolBalance
                                pool.takerTraitsForMakingAmount.traits,
                                pool.takerTraitsForMakingAmount.args,
                            ]),
                        ],
                    ],
                )
                .substring(2);

        const takerTraits = buildTakerTraits({
            makingAmount: true,
            extension: pool.order.extension,
            interaction: matchingParams,
        });

        const interaction =
            (await matcher.getAddress()) +
            '00' +
            inch.interface
                .encodeFunctionData('fillOrderArgs', [pool.order, pool.signature.r, pool.signature.vs, poolBalance, takerTraits.traits, takerTraits.args])
                .substring(10);

        const matcherTraits = buildTakerTraits({
            makingAmount: true,
            extension: pool.order.extension,
            interaction,
        });

        const tx = async () =>
            matcher.matchOrders(inch.target, pool.order, pool.signature.r, pool.signature.vs, poolBalance, matcherTraits.traits, matcherTraits.args);
        await expect(tx()).to.be.revertedWithCustomError(lopswap, 'NotEnoughLiquidity');
    });
});
