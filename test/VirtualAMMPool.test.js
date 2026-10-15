import { assertRoughlyEqualValues, constants, ethers, expect, loadFixture, time, trackReceivedTokenAndTx } from '@1inch/solidity-utils';

import { basePoolBehavioralTests } from './behavioral/BasePool.test.js';
import { initContractsAndPreparePool, initContractsWithInitPool, initRecursiveMatcher } from './helpers/fixtures.js';
import { buildTakerTraits, DEFAULT_PROTOCOL_FEE_RECEIVER, DEFAULT_PROVIDER_FEE_RECEIVER, PoolType, getProviderFee } from './helpers/orders.js';

const DECAY_PERIOD = 5 * 60;

function fillByTakingAmount(inch, taker, pool, amount) {
    return inch
        .connect(taker)
        .fillOrderArgs(pool.order, pool.signature.r, pool.signature.vs, amount, pool.takerTraitsForTakingAmount.traits, pool.takerTraitsForTakingAmount.args);
}

describe('VirtualAMMPool', async function () {
    describe('BasePool Behavioral', async function () {
        await basePoolBehavioralTests(PoolType.VIRTUAL_AMM);
    });

    describe('should save AMM balance after swap', async function () {
        const initVirtualAMMPool = () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.VIRTUAL_AMM,
            });

        it('assetB -> assetA, use takingAmount in takerTraits (assetA is makerAsset)', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initVirtualAMMPool);

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
            } = await loadFixture(initVirtualAMMPool);

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
            } = await loadFixture(initVirtualAMMPool);

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
            } = await loadFixture(initVirtualAMMPool);

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
            const { tokens, lopswap, inch, lopapool } = await loadFixture(initVirtualAMMPool);
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

    describe('virtual balances', async function () {
        const initVirtualPool = () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.VIRTUAL_AMM,
                providerFee: 0n,
            });

        for (const { direction, inputToken, outputToken } of [
            { direction: 'AB', inputToken: 'TKR', outputToken: 'MKR' },
            { direction: 'BA', inputToken: 'MKR', outputToken: 'TKR' },
        ]) {
            it(`should create virtual balances after the first ${direction} swap`, async function () {
                const {
                    accounts: { bob },
                    tokens,
                    lopswap,
                    inch,
                    lopapool,
                } = await loadFixture(initVirtualPool);
                const pool = lopapool[direction];

                await fillByTakingAmount(inch, bob, pool, tokens[inputToken].parseAmount('1'));

                const inputAsset = await tokens[inputToken].getAddress();
                const outputAsset = await tokens[outputToken].getAddress();
                const inputBalance = await lopswap.balances(lopapool.id, inputAsset);
                const outputBalance = await lopswap.balances(lopapool.id, outputAsset);

                expect(await lopswap.getBalanceForAddition(lopapool.id, outputAsset)).to.be.gt(outputBalance);
                expect(await lopswap.getBalanceForRemoval(lopapool.id, inputAsset)).to.be.lt(inputBalance);
                expect(await lopswap.getBalanceForAddition(lopapool.id, inputAsset)).to.equal(inputBalance);
                expect(await lopswap.getBalanceForRemoval(lopapool.id, outputAsset)).to.equal(outputBalance);
            });
        }

        it('should linearly decay virtual balances to real balances', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initVirtualPool);
            const pool = lopapool.AB;
            const makerAsset = await tokens.MKR.getAddress();
            const takerAsset = await tokens.TKR.getAddress();

            await fillByTakingAmount(inch, bob, pool, tokens.TKR.parseAmount('1'));

            const realMakerBalance = await lopswap.balances(lopapool.id, makerAsset);
            const realTakerBalance = await lopswap.balances(lopapool.id, takerAsset);
            const initialAdditionBalance = await lopswap.getBalanceForAddition(lopapool.id, makerAsset);
            const initialRemovalBalance = await lopswap.getBalanceForRemoval(lopapool.id, takerAsset);

            await time.increase(DECAY_PERIOD / 2);

            const halfAdditionBalance = await lopswap.getBalanceForAddition(lopapool.id, makerAsset);
            const halfRemovalBalance = await lopswap.getBalanceForRemoval(lopapool.id, takerAsset);
            expect(halfAdditionBalance).to.equal((initialAdditionBalance + realMakerBalance) / 2n);
            expect(halfRemovalBalance).to.equal((initialRemovalBalance + realTakerBalance) / 2n);
            expect(halfAdditionBalance).to.be.lt(initialAdditionBalance);
            expect(halfAdditionBalance).to.be.gt(realMakerBalance);
            expect(halfRemovalBalance).to.be.gt(initialRemovalBalance);
            expect(halfRemovalBalance).to.be.lt(realTakerBalance);

            await time.increase(DECAY_PERIOD / 2);

            expect(await lopswap.getBalanceForAddition(lopapool.id, makerAsset)).to.equal(realMakerBalance);
            expect(await lopswap.getBalanceForRemoval(lopapool.id, takerAsset)).to.equal(realTakerBalance);
        });

        it('should make an immediate reverse swap worse and remove the penalty after decay', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initVirtualPool);

            await fillByTakingAmount(inch, bob, lopapool.AB, tokens.TKR.parseAmount('1'));

            const reversePool = lopapool.BA;
            const balanceIn = await lopswap.balances(lopapool.id, reversePool.order.takerAsset);
            const balanceOut = await lopswap.balances(lopapool.id, reversePool.order.makerAsset);
            const amountIn = tokens.MKR.parseAmount('0.1');
            const amountOut = tokens.TKR.parseAmount('0.1');
            const realMakingAmount = (amountIn * balanceOut) / (balanceIn + amountIn);
            const balanceOutAfter = balanceOut - amountOut;
            const realTakingAmount = (balanceIn * amountOut + balanceOutAfter - 1n) / balanceOutAfter;

            expect(await lopswap.getReturnMakingAmount(reversePool.order, amountIn)).to.be.lt(realMakingAmount);
            expect(await lopswap.getReturnTakingAmount(reversePool.order, amountOut)).to.be.gt(realTakingAmount);

            await time.increase(DECAY_PERIOD);

            expect(await lopswap.getReturnMakingAmount(reversePool.order, amountIn)).to.equal(realMakingAmount);
            expect(await lopswap.getReturnTakingAmount(reversePool.order, amountOut)).to.equal(realTakingAmount);
        });

        it('should update virtual balances during a reverse swap before decay', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initVirtualPool);
            const makerAsset = await tokens.MKR.getAddress();
            const takerAsset = await tokens.TKR.getAddress();

            await fillByTakingAmount(inch, bob, lopapool.AB, tokens.TKR.parseAmount('1'));

            const additionBalanceBefore = await lopswap.getBalanceForAddition(lopapool.id, makerAsset);
            const removalBalanceBefore = await lopswap.getBalanceForRemoval(lopapool.id, takerAsset);
            const makerBalanceBefore = await lopswap.balances(lopapool.id, makerAsset);
            const takerBalanceBefore = await lopswap.balances(lopapool.id, takerAsset);

            await fillByTakingAmount(inch, bob, lopapool.BA, tokens.MKR.parseAmount('0.1'));

            const additionData = await lopswap.virtualBalancesForAddition(lopapool.id, makerAsset);
            const removalData = await lopswap.virtualBalancesForRemoval(lopapool.id, takerAsset);
            expect(additionData.balance).to.be.gt(additionBalanceBefore);
            expect(removalData.balance).to.be.lt(removalBalanceBefore);
            expect(await lopswap.balances(lopapool.id, makerAsset)).to.be.gt(makerBalanceBefore);
            expect(await lopswap.balances(lopapool.id, takerAsset)).to.be.lt(takerBalanceBefore);
        });

        it('should clamp virtual balances after liquidity changes', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initVirtualPool);
            const makerAsset = await tokens.MKR.getAddress();
            const takerAsset = await tokens.TKR.getAddress();

            await fillByTakingAmount(inch, bob, lopapool.AB, tokens.TKR.parseAmount('1'));

            const additionBalance = await lopswap.getBalanceForAddition(lopapool.id, makerAsset);
            const removalBalance = await lopswap.getBalanceForRemoval(lopapool.id, takerAsset);
            const newMakerBalance = additionBalance + 1n;
            const newTakerBalance = removalBalance - 1n;

            await lopswap.setLiquidity(lopapool.AB.order, [makerAsset, takerAsset], [newMakerBalance, newTakerBalance]);

            expect(await lopswap.getBalanceForAddition(lopapool.id, makerAsset)).to.equal(newMakerBalance);
            expect(await lopswap.getBalanceForRemoval(lopapool.id, takerAsset)).to.equal(newTakerBalance);
        });
    });

    describe('fees', async function () {
        const initVirtualPoolWithProviderFee = () =>
            initContractsWithInitPool({
                typeOfOrder: PoolType.VIRTUAL_AMM,
                providerFee: 1000n,
            });

        const initVirtualPoolWithCustomProviderFeeReceiver = () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.VIRTUAL_AMM,
                providerFeeReceiver: DEFAULT_PROVIDER_FEE_RECEIVER,
            });

        const initVirtualPoolWithProtocolFee = () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.VIRTUAL_AMM,
                providerFee: 0n,
                protocolFee: 2000n,
                protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
            });

        const initVirtualPoolWithProviderAndProtocolFees = () =>
            initContractsWithInitPool({
                typeOfOrder: PoolType.VIRTUAL_AMM,
                providerFee: 500n,
                protocolFee: 1500n,
                protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
            });

        const initVirtualPoolWithCustomFeeReceivers = () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.VIRTUAL_AMM,
                providerFee: 500n,
                protocolFee: 1500n,
                protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
                providerFeeReceiver: DEFAULT_PROVIDER_FEE_RECEIVER,
            });

        const initVirtualPoolWithFeesAboveBase = () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.VIRTUAL_AMM,
                providerFee: 50001n,
                protocolFee: 50000n,
                protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
            });

        const initVirtualPoolWithFeesEqualToBase = () =>
            initContractsAndPreparePool({
                typeOfOrder: PoolType.VIRTUAL_AMM,
                providerFee: 50000n,
                protocolFee: 50000n,
                protocolFeeReceiver: DEFAULT_PROTOCOL_FEE_RECEIVER,
            });

        it('should apply provider fee once to the pool balance', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initVirtualPoolWithProviderFee);
            const pool = lopapool.AB;
            const amount = tokens.TKR.parseAmount('2');
            const balancesBefore = await lopswap.getBalances(pool.order);
            const makerBalanceBefore = await tokens.TKR.balanceOf(pool.order.maker);

            await fillByTakingAmount(inch, bob, pool, amount);

            const balancesAfter = await lopswap.getBalances(pool.order);
            const makerBalanceAfter = await tokens.TKR.balanceOf(pool.order.maker);
            const providerFee = getProviderFee(pool.order);
            expect(balancesAfter.takerAssetBalance - balancesBefore.takerAssetBalance).to.equal((amount * (baseFee - providerFee)) / baseFee);
            expect(makerBalanceAfter - makerBalanceBefore).to.equal(amount);
        });

        it('should apply provider fee once when filled by makingAmount', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initVirtualPoolWithProviderFee);
            const pool = lopapool.AB;
            const amount = tokens.MKR.parseAmount('2');
            const balancesBefore = await lopswap.getBalances(pool.order);
            const makerBalanceBefore = await tokens.TKR.balanceOf(pool.order.maker);

            await inch
                .connect(bob)
                .fillOrderArgs(
                    pool.order,
                    pool.signature.r,
                    pool.signature.vs,
                    amount,
                    pool.takerTraitsForMakingAmount.traits,
                    pool.takerTraitsForMakingAmount.args,
                );

            const balancesAfter = await lopswap.getBalances(pool.order);
            const makerBalanceAfter = await tokens.TKR.balanceOf(pool.order.maker);
            const makerBalanceDiff = makerBalanceAfter - makerBalanceBefore;
            expect(balancesAfter.takerAssetBalance - balancesBefore.takerAssetBalance).to.equal(
                (makerBalanceDiff * (baseFee - getProviderFee(pool.order))) / baseFee,
            );
        });

        it('should pay provider fee to a custom receiver', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initVirtualPoolWithCustomProviderFeeReceiver);
            const pool = lopapool.AB;
            const amount = tokens.TKR.parseAmount('2');
            const balancesBefore = await lopswap.getBalances(pool.order);
            const makerBalanceBefore = await tokens.TKR.balanceOf(pool.order.maker);

            await fillByTakingAmount(inch, bob, pool, amount);

            const balancesAfter = await lopswap.getBalances(pool.order);
            const makerBalanceAfter = await tokens.TKR.balanceOf(pool.order.maker);
            expect(balancesAfter.takerAssetBalance - balancesBefore.takerAssetBalance).to.equal(makerBalanceAfter - makerBalanceBefore);
            expect(makerBalanceAfter - makerBalanceBefore).to.equal((amount * (baseFee - getProviderFee(pool.order))) / baseFee);
            expect(await tokens.TKR.balanceOf(DEFAULT_PROVIDER_FEE_RECEIVER)).to.equal((amount * getProviderFee(pool.order)) / baseFee);
        });

        it('should pay protocol fee when filled by takingAmount', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initVirtualPoolWithProtocolFee);
            const pool = lopapool.AB;
            const amount = tokens.TKR.parseAmount('2');
            const balancesBefore = await lopswap.getBalances(pool.order);
            const makerBalanceBefore = await tokens.TKR.balanceOf(pool.order.maker);
            const protocolBalanceBefore = await tokens.TKR.balanceOf(DEFAULT_PROTOCOL_FEE_RECEIVER);

            await fillByTakingAmount(inch, bob, pool, amount);

            const balancesAfter = await lopswap.getBalances(pool.order);
            const makerBalanceAfter = await tokens.TKR.balanceOf(pool.order.maker);
            const protocolBalanceAfter = await tokens.TKR.balanceOf(DEFAULT_PROTOCOL_FEE_RECEIVER);
            const protocolFee = await lopswap.protocolFee();
            expect(balancesAfter.takerAssetBalance - balancesBefore.takerAssetBalance).to.equal(makerBalanceAfter - makerBalanceBefore);
            expect(protocolBalanceAfter - protocolBalanceBefore).to.equal((amount * protocolFee) / baseFee);
        });

        it('should pay protocol fee when filled by makingAmount', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initVirtualPoolWithProtocolFee);
            const pool = lopapool.AB;
            const amount = tokens.MKR.parseAmount('2');
            const balancesBefore = await lopswap.getBalances(pool.order);
            const makerBalanceBefore = await tokens.TKR.balanceOf(pool.order.maker);
            const fill = () =>
                inch
                    .connect(bob)
                    .fillOrderArgs(
                        pool.order,
                        pool.signature.r,
                        pool.signature.vs,
                        amount,
                        pool.takerTraitsForMakingAmount.traits,
                        pool.takerTraitsForMakingAmount.args,
                    );

            const [receivedFee] = await trackReceivedTokenAndTx(ethers.provider, tokens.TKR, DEFAULT_PROTOCOL_FEE_RECEIVER, fill);
            const balancesAfter = await lopswap.getBalances(pool.order);
            const makerBalanceAfter = await tokens.TKR.balanceOf(pool.order.maker);
            const makerBalanceDiff = makerBalanceAfter - makerBalanceBefore;
            assertRoughlyEqualValues(balancesAfter.takerAssetBalance - balancesBefore.takerAssetBalance, makerBalanceDiff, 1e-6);
            const protocolFee = await lopswap.protocolFee();
            expect(receivedFee).to.equal(((makerBalanceDiff + receivedFee) * protocolFee) / baseFee);
        });

        it('should revert when total fee is above FEE_BASE', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initVirtualPoolWithFeesAboveBase);
            const pool = lopapool.AB;
            const tx = inch
                .connect(bob)
                .fillOrderArgs(
                    pool.order,
                    pool.signature.r,
                    pool.signature.vs,
                    tokens.TKR.parseAmount('2'),
                    pool.takerTraitsForTakingAmount.traits,
                    pool.takerTraitsForTakingAmount.args,
                );
            await expect(tx).to.be.revertedWithCustomError(lopswap, 'FeesTooHigh');
        });

        it('should revert when total fee is equal to FEE_BASE', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
            } = await loadFixture(initVirtualPoolWithFeesEqualToBase);
            const pool = lopapool.AB;
            const tx = inch
                .connect(bob)
                .fillOrderArgs(
                    pool.order,
                    pool.signature.r,
                    pool.signature.vs,
                    tokens.TKR.parseAmount('2'),
                    pool.takerTraitsForTakingAmount.traits,
                    pool.takerTraitsForTakingAmount.args,
                );
            await expect(tx).to.be.revertedWithCustomError(lopswap, 'FeesTooHigh');
        });

        it('should apply provider and protocol fees once to the pool balance', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initVirtualPoolWithProviderAndProtocolFees);
            const pool = lopapool.AB;
            const amount = tokens.TKR.parseAmount('2');
            const balancesBefore = await lopswap.getBalances(pool.order);
            const makerBalanceBefore = await tokens.TKR.balanceOf(pool.order.maker);
            const protocolBalanceBefore = await tokens.TKR.balanceOf(DEFAULT_PROTOCOL_FEE_RECEIVER);

            await fillByTakingAmount(inch, bob, pool, amount);

            const balancesAfter = await lopswap.getBalances(pool.order);
            const makerBalanceAfter = await tokens.TKR.balanceOf(pool.order.maker);
            const protocolBalanceAfter = await tokens.TKR.balanceOf(DEFAULT_PROTOCOL_FEE_RECEIVER);
            const providerFee = getProviderFee(pool.order);
            const protocolFee = await lopswap.protocolFee();
            expect(balancesAfter.takerAssetBalance - balancesBefore.takerAssetBalance).to.equal((amount * (baseFee - providerFee - protocolFee)) / baseFee);
            expect(makerBalanceAfter - makerBalanceBefore).to.equal((amount * (baseFee - protocolFee)) / baseFee);
            expect(protocolBalanceAfter - protocolBalanceBefore).to.equal((amount * protocolFee) / baseFee);
        });

        it('should apply provider and protocol fees once when filled by makingAmount', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initVirtualPoolWithProviderAndProtocolFees);
            const pool = lopapool.AB;
            const amount = tokens.MKR.parseAmount('2');
            const balancesBefore = await lopswap.getBalances(pool.order);
            const makerBalanceBefore = await tokens.TKR.balanceOf(pool.order.maker);
            const fill = () =>
                inch
                    .connect(bob)
                    .fillOrderArgs(
                        pool.order,
                        pool.signature.r,
                        pool.signature.vs,
                        amount,
                        pool.takerTraitsForMakingAmount.traits,
                        pool.takerTraitsForMakingAmount.args,
                    );

            const [receivedFee] = await trackReceivedTokenAndTx(ethers.provider, tokens.TKR, DEFAULT_PROTOCOL_FEE_RECEIVER, fill);
            const balancesAfter = await lopswap.getBalances(pool.order);
            const makerBalanceAfter = await tokens.TKR.balanceOf(pool.order.maker);
            const poolBalanceDiff = balancesAfter.takerAssetBalance - balancesBefore.takerAssetBalance;
            const makerBalanceDiff = makerBalanceAfter - makerBalanceBefore;
            const takingAmount = makerBalanceDiff + receivedFee;
            const providerFee = getProviderFee(pool.order);
            const protocolFee = await lopswap.protocolFee();
            expect(poolBalanceDiff).to.equal((takingAmount * (baseFee - providerFee - protocolFee)) / baseFee);
            assertRoughlyEqualValues(makerBalanceDiff, (takingAmount * (baseFee - protocolFee)) / baseFee, 1e-6);
            expect(receivedFee).to.equal((takingAmount * protocolFee) / baseFee);
        });

        it('should pay provider and protocol fees to custom receivers', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool,
                baseFee,
            } = await loadFixture(initVirtualPoolWithCustomFeeReceivers);
            const pool = lopapool.AB;
            const amount = tokens.TKR.parseAmount('2');
            const balancesBefore = await lopswap.getBalances(pool.order);
            const makerBalanceBefore = await tokens.TKR.balanceOf(pool.order.maker);
            const protocolBalanceBefore = await tokens.TKR.balanceOf(DEFAULT_PROTOCOL_FEE_RECEIVER);

            await fillByTakingAmount(inch, bob, pool, amount);

            const balancesAfter = await lopswap.getBalances(pool.order);
            const makerBalanceAfter = await tokens.TKR.balanceOf(pool.order.maker);
            const protocolBalanceAfter = await tokens.TKR.balanceOf(DEFAULT_PROTOCOL_FEE_RECEIVER);
            const providerFee = getProviderFee(pool.order);
            const protocolFee = await lopswap.protocolFee();
            expect(balancesAfter.takerAssetBalance - balancesBefore.takerAssetBalance).to.equal((amount * (baseFee - providerFee - protocolFee)) / baseFee);
            expect(makerBalanceAfter - makerBalanceBefore).to.equal((amount * (baseFee - providerFee - protocolFee)) / baseFee);
            expect(protocolBalanceAfter - protocolBalanceBefore).to.equal((amount * protocolFee) / baseFee);
            expect(await tokens.TKR.balanceOf(DEFAULT_PROVIDER_FEE_RECEIVER)).to.equal((amount * providerFee) / baseFee);
        });
    });
});
