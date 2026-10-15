import { assertRoughlyEqualValues, constants, ethers, expect, loadFixture, trackReceivedTokenAndTx } from '@1inch/solidity-utils';

import { basePoolBehavioralTests } from './behavioral/BasePool.test.js';
import { initContractsAndPreparePool, initRecursiveMatcher } from './helpers/fixtures.js';
import { getProviderFee, DEFAULT_PROTOCOL_FEE_RECEIVER, PoolType, DEFAULT_PROVIDER_FEE_RECEIVER, buildTakerTraits } from './helpers/orders.js';

describe('SimpleAMMPool', async function () {
    describe('BasePool Behavioral', async function () {
        await basePoolBehavioralTests(PoolType.SIMPLE_AMM);
    });

    describe('should save AMM balance after swap', async function () {
        it('assetB -> assetA, use takingAmount in takerTraits (assetA is makerAsset)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initContractsAndPreparePool);

            const swapAmount = tokens.TKR.parseAmount('2'); // in takerAsset
            const pool = lopapool.AB;

            for (let i = 0; i < 3; i++) {
                const balancesBefore = await lopswap.getBalances(pool.order);
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
                const balancesAfter = await lopswap.getBalances(pool.order);
                expect(
                    (balancesAfter.makerAssetBalance * balancesAfter.takerAssetBalance) / (balancesBefore.makerAssetBalance * balancesBefore.takerAssetBalance),
                ).to.be.eq(1n);
            }
        });

        it('assetB -> assetA, use makingAmount in takerTraits (assetA is makerAsset)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initContractsAndPreparePool);

            const swapAmount = tokens.MKR.parseAmount('2'); // in makerAsset
            const pool = lopapool.AB;

            for (let i = 0; i < 3; i++) {
                const balancesBefore = await lopswap.getBalances(pool.order);
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
                const balancesAfter = await lopswap.getBalances(pool.order);
                expect(
                    (balancesBefore.makerAssetBalance * balancesBefore.takerAssetBalance) / (balancesAfter.makerAssetBalance * balancesAfter.takerAssetBalance),
                ).to.be.eq(1n);
            }
        });

        it('assetA -> assetB, use takingAmount in takerTraits (assetB is makerAsset)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initContractsAndPreparePool);

            const swapAmount = tokens.MKR.parseAmount('2'); // in takerAsset
            const pool = lopapool.BA;

            for (let i = 0; i < 3; i++) {
                const balancesBefore = await lopswap.getBalances(pool.order);
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
                const balancesAfter = await lopswap.getBalances(pool.order);
                expect(
                    (balancesAfter.makerAssetBalance * balancesAfter.takerAssetBalance) / (balancesBefore.makerAssetBalance * balancesBefore.takerAssetBalance),
                ).to.be.eq(1n);
            }
        });

        it('assetB -> assetA, use makingAmount in takerTraits (assetB is makerAsset)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initContractsAndPreparePool);

            const swapAmount = tokens.TKR.parseAmount('2'); // in makerAsset
            const pool = lopapool.BA;

            for (let i = 0; i < 3; i++) {
                const balancesBefore = await lopswap.getBalances(pool.order);
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
                const balancesAfter = await lopswap.getBalances(pool.order);
                expect(balancesAfter.makerAssetBalance * balancesAfter.takerAssetBalance).to.be.gte(
                    balancesBefore.makerAssetBalance * balancesBefore.takerAssetBalance,
                );

                const mulDecimals = (await tokens.MKR.decimals()) + (await tokens.TKR.decimals());
                expect(
                    (balancesBefore.makerAssetBalance * balancesBefore.takerAssetBalance) /
                        10n ** mulDecimals /
                        ((balancesAfter.makerAssetBalance * balancesAfter.takerAssetBalance) / 10n ** mulDecimals),
                ).to.be.eq(1n);
            }
        });

        it('recursive fill', async function () {
            const { tokens, lopswap, inch, lopapool } = await loadFixture(initContractsAndPreparePool);
            const matcher = await initRecursiveMatcher();

            const abiCoder = ethers.AbiCoder.defaultAbiCoder();
            const matchingParams =
                (await matcher.getAddress()) +
                '01' +
                abiCoder
                    .encode(
                        ['address[]', 'bytes[]'],
                        [
                            [await tokens.MKR.getAddress()],
                            [tokens.MKR.interface.encodeFunctionData('approve', [await inch.getAddress(), constants.MAX_UINT256])],
                        ],
                    )
                    .substring(2);

            const swapAmount = tokens.TKR.parseAmount('2'); // in makerAsset
            const pool = lopapool.BA;

            const takerTraits = buildTakerTraits({
                makingAmount: true,
                extension: pool.order.extension,
                interaction: matchingParams,
            });

            const interaction =
                (await matcher.getAddress()) +
                '00' +
                inch.interface
                    .encodeFunctionData('fillOrderArgs', [pool.order, pool.signature.r, pool.signature.vs, swapAmount, takerTraits.traits, takerTraits.args])
                    .substring(10);

            const matcherTraits = buildTakerTraits({
                makingAmount: true,
                extension: pool.order.extension,
                interaction,
            });

            const balancesBefore = await lopswap.getBalances(pool.order);

            await tokens.MKR.transfer(matcher, tokens.MKR.parseAmount('2') * 2n);
            await matcher.matchOrders(inch.target, pool.order, pool.signature.r, pool.signature.vs, swapAmount, matcherTraits.traits, matcherTraits.args);

            const balancesAfter = await lopswap.getBalances(pool.order);
            expect(balancesAfter.makerAssetBalance * balancesAfter.takerAssetBalance).to.be.gte(
                balancesBefore.makerAssetBalance * balancesBefore.takerAssetBalance,
            );

            const mulDecimals = (await tokens.MKR.decimals()) + (await tokens.TKR.decimals());
            expect(
                (balancesBefore.makerAssetBalance * balancesBefore.takerAssetBalance) /
                    10n ** mulDecimals /
                    ((balancesAfter.makerAssetBalance * balancesAfter.takerAssetBalance) / 10n ** mulDecimals),
            ).to.be.eq(1n);
        });
    });

    describe('should pay correct provider liquidity fee (maker)', async function () {
        const initPoolWithCustomProviderFeeReceiver = () =>
            initContractsAndPreparePool({
                providerFeeReceiver: DEFAULT_PROVIDER_FEE_RECEIVER,
            });

        it('pool takerAsset balances diff should be the same as maker balances diff with fee (use takingAmount in takerTrait)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initContractsAndPreparePool);

            const swapAmount = tokens.TKR.parseAmount('2'); // in takerAsset
            const pool = lopapool.AB;

            const balancesBefore = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
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
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };

            const makerBalanceDiff = balancesAfter.makerTKR - balancesBefore.makerTKR;
            expect(balancesAfter.pool.takerAssetBalance - balancesBefore.pool.takerAssetBalance).to.be.eq(
                (makerBalanceDiff * (baseFee - getProviderFee(pool.order))) / baseFee,
            );
        });

        it('pool takerAsset balances diff should be the same as maker balances diff with fee (use makingAmount in takerTrait)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initContractsAndPreparePool);

            const swapAmount = tokens.MKR.parseAmount('2'); // in makerAsset
            const pool = lopapool.AB;

            const balancesBefore = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
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
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };

            const makerBalanceDiff = balancesAfter.makerTKR - balancesBefore.makerTKR;
            expect(balancesAfter.pool.takerAssetBalance - balancesBefore.pool.takerAssetBalance).to.be.eq(
                (makerBalanceDiff * (baseFee - getProviderFee(pool.order))) / baseFee,
            );
        });

        it('with custom provider receiver pool takerAsset balances diff should be the same as maker balances', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initPoolWithCustomProviderFeeReceiver);

            const swapAmount = tokens.TKR.parseAmount('2'); // in takerAsset
            const pool = lopapool.AB;

            const balancesBefore = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
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
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };

            expect(balancesAfter.pool.takerAssetBalance - balancesBefore.pool.takerAssetBalance).to.be.eq(balancesAfter.makerTKR - balancesBefore.makerTKR);
            expect(await tokens.TKR.balanceOf(DEFAULT_PROVIDER_FEE_RECEIVER)).to.be.eq((swapAmount * getProviderFee(pool.order)) / baseFee);
        });
    });

    describe('should pay correct protocol fee', async function () {
        const initContractsAndPrepareCustomPool = async () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.SIMPLE_AMM,
                providerFee: 0n,
                protocolFee: 2000n,
                protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
            });

        it('pool takerAsset balances diff should be the same as maker balances diff (use takingAmount in takerTrait)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initContractsAndPrepareCustomPool);

            const swapAmount = tokens.TKR.parseAmount('2'); // in takerAsset
            const pool = lopapool.AB;

            const balancesBefore = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };
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
            const balancesAfter = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };

            // pool balance diff should be equal to maker balance diff
            expect(balancesAfter.pool.takerAssetBalance - balancesBefore.pool.takerAssetBalance).to.be.eq(balancesAfter.makerTKR - balancesBefore.makerTKR);
            // protocol fee should be paid
            const protocolFee = await lopswap.protocolFee();
            await expect(tx).to.be.changeTokenBalance(ethers, tokens.TKR, DEFAULT_PROTOCOL_FEE_RECEIVER, (swapAmount * protocolFee) / baseFee);
        });

        it('pool takerAsset balances diff should be the same as maker balances diff (use makingAmount in takerTrait)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initContractsAndPrepareCustomPool);

            const swapAmount = tokens.MKR.parseAmount('2'); // in makerAsset
            const pool = lopapool.AB;

            const balancesBefore = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };
            const fill = () =>
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
            const [receivedFee] = await trackReceivedTokenAndTx(ethers.provider, tokens.TKR, DEFAULT_PROTOCOL_FEE_RECEIVER, fill);
            const balancesAfter = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };

            const makerBalanceDiff = balancesAfter.makerTKR - balancesBefore.makerTKR;
            // pool balance diff should be equal to maker balance diff
            assertRoughlyEqualValues(balancesAfter.pool.takerAssetBalance - balancesBefore.pool.takerAssetBalance, makerBalanceDiff, 1e-6);
            // protocol fee should be paid
            const protocolFee = await lopswap.protocolFee();
            expect(receivedFee).to.be.eq(((makerBalanceDiff + receivedFee) * protocolFee) / baseFee);
        });
    });

    describe('should revert with incorrect fees', async function () {
        const initContractsAndSetIncorrectFeeGt = async () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.SIMPLE_AMM,
                providerFee: 50001n,
                protocolFee: 50000n,
                protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
            });

        const initContractsAndSetIncorrectFeeEq = async () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.SIMPLE_AMM,
                providerFee: 50000n,
                protocolFee: 50000n,
                protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
            });

        it('should revert when providerFee + protocolFee more than FEE_BASE', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initContractsAndSetIncorrectFeeGt);
            const pool = lopapool.AB;
            const tx = inch.connect(bob).fillOrderArgs(
                pool.order,
                pool.signature.r,
                pool.signature.vs,
                tokens.TKR.parseAmount('2'), // in takerAsset
                pool.takerTraitsForTakingAmount.traits,
                pool.takerTraitsForTakingAmount.args,
            );
            await expect(tx).to.be.revertedWithCustomError(lopswap, 'FeesTooHigh');
        });

        it('should revert when providerFee + protocolFee is equal to FEE_BASE', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initContractsAndSetIncorrectFeeEq);
            const pool = lopapool.AB;
            const tx = inch.connect(bob).fillOrderArgs(
                pool.order,
                pool.signature.r,
                pool.signature.vs,
                tokens.TKR.parseAmount('2'), // in takerAsset
                pool.takerTraitsForTakingAmount.traits,
                pool.takerTraitsForTakingAmount.args,
            );
            await expect(tx).to.be.revertedWithCustomError(lopswap, 'FeesTooHigh');
        });
    });

    describe('should pay correct provider and protocol fees at the same time', async function () {
        const initContractsAndPrepareCustomPool = async () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.SIMPLE_AMM,
                providerFee: 500n,
                protocolFee: 1500n,
                protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
            });

        const initCustomPoolWithCustomProviderFeeReceiver = () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.SIMPLE_AMM,
                providerFee: 500n,
                protocolFee: 1500n,
                protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
                providerFeeReceiver: DEFAULT_PROVIDER_FEE_RECEIVER,
            });

        it('pool takerAsset balances diff should be the same as maker balances diff with fee (use takingAmount in takerTrait)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initContractsAndPrepareCustomPool);

            const swapAmount = tokens.TKR.parseAmount('2'); // in takerAsset
            const pool = lopapool.AB;

            const balancesBefore = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };
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
            const balancesAfter = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };

            const protocolFee = await lopswap.protocolFee();
            // pool balance diff should be equal to swapAmount without fees
            expect(balancesAfter.pool.takerAssetBalance - balancesBefore.pool.takerAssetBalance).to.be.eq(
                (swapAmount * (baseFee - getProviderFee(pool.order) - protocolFee)) / baseFee,
            );
            // maker balance diff should be equal to swapAmount with provider fee
            expect(balancesAfter.makerTKR - balancesBefore.makerTKR).to.be.eq((swapAmount * (baseFee - protocolFee)) / baseFee);
            // protocol fee should be paid
            await expect(tx).to.be.changeTokenBalance(ethers, tokens.TKR, DEFAULT_PROTOCOL_FEE_RECEIVER, (swapAmount * protocolFee) / baseFee);
        });

        it('pool takerAsset balances diff should be the same as maker balances diff with fee (use makingAmount in takerTrait)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initContractsAndPrepareCustomPool);

            const swapAmount = tokens.MKR.parseAmount('2'); // in makerAsset
            const pool = lopapool.AB;

            const balancesBefore = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };
            const fill = () =>
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
            const [receivedFee] = await trackReceivedTokenAndTx(ethers.provider, tokens.TKR, DEFAULT_PROTOCOL_FEE_RECEIVER, fill);
            const balancesAfter = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };

            const poolBalanceDiff = balancesAfter.pool.takerAssetBalance - balancesBefore.pool.takerAssetBalance;
            const makerBalanceDiff = balancesAfter.makerTKR - balancesBefore.makerTKR;
            /**
             *  poolBalanceDiff = takingAmount - prociderFee - protocolFee
             *  makerBalanceDiff = takingAmount - protocolFee
             *  makerBalanceDiff + receivedFee = takingAmount
             */
            const takingAmount = makerBalanceDiff + receivedFee;

            const protocolFee = await lopswap.protocolFee();
            // pool balance diff should be equal to swapAmount without fees
            expect(poolBalanceDiff).to.be.eq((takingAmount * (baseFee - getProviderFee(pool.order) - protocolFee)) / baseFee);
            // maker balance diff should be equal to swapAmount with provider fee
            assertRoughlyEqualValues(makerBalanceDiff, (takingAmount * (baseFee - protocolFee)) / baseFee, 1e-6);
            // protocol fee should be paid
            expect(receivedFee).to.be.eq((takingAmount * protocolFee) / baseFee);
        });

        it('with custom provider receiver pool takerAsset balances diff should be the same as maker balances diff', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initCustomPoolWithCustomProviderFeeReceiver);

            const swapAmount = tokens.TKR.parseAmount('2'); // in takerAsset
            const pool = lopapool.AB;

            const balancesBefore = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };
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
            const balancesAfter = {
                pool: await lopswap.getBalances(pool.order),
                makerTKR: await tokens.TKR.balanceOf(pool.order.maker),
            };

            const protocolFee = await lopswap.protocolFee();
            // pool balance diff should be equal to swapAmount without fees
            expect(balancesAfter.pool.takerAssetBalance - balancesBefore.pool.takerAssetBalance).to.be.eq(
                (swapAmount * (baseFee - getProviderFee(pool.order) - protocolFee)) / baseFee,
            );
            // maker balance diff should be equal to swapAmount without fees
            expect(balancesAfter.makerTKR - balancesBefore.makerTKR).to.be.eq((swapAmount * (baseFee - getProviderFee(pool.order) - protocolFee)) / baseFee);
            // protocol fee should be paid
            await expect(tx).to.be.changeTokenBalance(ethers, tokens.TKR, DEFAULT_PROTOCOL_FEE_RECEIVER, (swapAmount * protocolFee) / baseFee);
            // provider fee should be paid to custom receiver
            expect(await tokens.TKR.balanceOf(DEFAULT_PROVIDER_FEE_RECEIVER)).to.be.eq((swapAmount * getProviderFee(pool.order)) / baseFee);
        });
    });
});
