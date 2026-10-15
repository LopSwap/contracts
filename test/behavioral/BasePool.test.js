import { ethers, expect, loadFixture, trackReceivedTokenAndTx } from '@1inch/solidity-utils';

import { initContractsAndPreparePool, initContractsWithInitPool } from '../helpers/fixtures.js';
import { PoolStatus } from '../helpers/orders.js';

async function basePoolBehavioralTests(poolType) {
    const initContractsAndPreparePoolWithType = () => initContractsAndPreparePool({ typeOfOrder: poolType });
    const initContractsWithInitPoolWithType = () => initContractsWithInitPool({ typeOfOrder: poolType });

    describe('getPool', async function () {
        it('should return the same pool for both orders', async function () {
            const { lopswap, lopapool } = await loadFixture(initContractsAndPreparePoolWithType);
            const orderABLopapool = await lopswap.getPool(lopapool.AB.order);
            const orderBALopapool = await lopswap.getPool(lopapool.BA.order);
            expect(orderABLopapool).to.equal(orderBALopapool);
        });
    });

    describe('poolStatus', async function () {
        it('should be NEW for not initialized pool', async function () {
            const { lopswap, lopapool } = await loadFixture(initContractsAndPreparePoolWithType);
            expect(await lopswap.poolStatus(lopapool.id)).to.be.equal(PoolStatus.NEW);
        });

        it('should be INITIALIZED for initialized pool', async function () {
            const { lopswap, lopapool } = await loadFixture(initContractsWithInitPoolWithType);
            expect(await lopswap.poolStatus(lopapool.id)).to.be.equal(PoolStatus.INITIALIZED);
        });

        it('should be INVALIDATED for canceled pool', async function () {
            const { lopswap, lopapool } = await loadFixture(initContractsAndPreparePoolWithType);
            await lopswap.invalidatePool(lopapool.AB.order);
            expect(await lopswap.poolStatus(lopapool.id)).to.be.equal(PoolStatus.INVALIDATED);
        });
    });

    describe('balances', async function () {
        it('should return 0 before pool initialized', async function () {
            const { lopswap, lopapool } = await loadFixture(initContractsAndPreparePoolWithType);
            expect(await lopswap.balances(lopapool.id, lopapool.AB.order.makerAsset)).to.equal(0n);
            expect(await lopswap.balances(lopapool.id, lopapool.AB.order.takerAsset)).to.equal(0n);
        });

        it('should return actual pool balances after initialized', async function () {
            const { lopswap, lopapool, initBalances } = await loadFixture(initContractsWithInitPoolWithType);
            expect(await lopswap.balances(lopapool.id, lopapool.AB.order.makerAsset)).to.equal(initBalances.AB.makerAssetAmount);
            expect(await lopswap.balances(lopapool.id, lopapool.AB.order.takerAsset)).to.equal(initBalances.AB.takerAssetAmount);
        });
    });

    describe('invalidatePool', async function () {
        async function invalidatePool(ABorBA) {
            it('should change pool status for initialized pool', async function () {
                const { lopswap, lopapool } = await loadFixture(initContractsWithInitPoolWithType);
                await lopswap.invalidatePool(lopapool[ABorBA].order);
                expect(await lopswap.poolStatus(lopapool.id)).to.be.equal(PoolStatus.INVALIDATED);
            });

            it('should change pool status for non initialized pool', async function () {
                const { lopswap, lopapool } = await loadFixture(initContractsAndPreparePoolWithType);
                await lopswap.invalidatePool(lopapool[ABorBA].order);
                expect(await lopswap.poolStatus(lopapool.id)).to.be.equal(PoolStatus.INVALIDATED);
            });

            it('should revert if account is not maker or protocol owner', async function () {
                const {
                    accounts: { bob },
                    lopswap,
                    lopapool,
                } = await loadFixture(initContractsAndPreparePoolWithType);
                expect(lopapool[ABorBA].order.maker).to.be.not.equal(bob.address);
                expect(await lopswap.owner()).to.be.not.equal(bob.address);
                await expect(lopswap.connect(bob).invalidatePool(lopapool[ABorBA].order)).to.be.revertedWithCustomError(lopswap, 'AccessDenied');
            });

            it('should change pool status by protocol owner', async function () {
                const {
                    accounts: { owner },
                    lopswap,
                    lopapool,
                } = await loadFixture(initContractsAndPreparePoolWithType);
                await lopswap.connect(owner).invalidatePool(lopapool[ABorBA].order);
                expect(await lopswap.poolStatus(lopapool.id)).to.be.equal(PoolStatus.INVALIDATED);
            });

            it('should revert if someone try to fill non initialized order', async function () {
                const {
                    accounts: { bob },
                    tokens,
                    lopswap,
                    inch,
                    lopapool,
                } = await loadFixture(initContractsAndPreparePoolWithType);
                const pool = lopapool[ABorBA];
                await lopswap.invalidatePool(pool.order);
                const token = ABorBA === 'AB' ? tokens.TKR : tokens.MKR;
                const fillOrderTx = async () =>
                    inch
                        .connect(bob)
                        .fillOrderArgs(
                            pool.order,
                            pool.signature.r,
                            pool.signature.vs,
                            token.parseAmount('1'),
                            pool.takerTraitsForTakingAmount.traits,
                            pool.takerTraitsForTakingAmount.args,
                        );
                await expect(fillOrderTx()).to.be.revertedWithCustomError(lopswap, 'NotEnoughLiquidity');
            });

            it('should revert if someone try to fill initialized order', async function () {
                const {
                    accounts: { bob },
                    tokens,
                    lopswap,
                    inch,
                    lopapool,
                } = await loadFixture(initContractsWithInitPoolWithType);
                const pool = lopapool[ABorBA];
                await lopswap.invalidatePool(pool.order);
                const token = ABorBA === 'AB' ? tokens.TKR : tokens.MKR;
                const fillOrderTx = async () =>
                    inch
                        .connect(bob)
                        .fillOrderArgs(
                            pool.order,
                            pool.signature.r,
                            pool.signature.vs,
                            token.parseAmount('1'),
                            pool.takerTraitsForTakingAmount.traits,
                            pool.takerTraitsForTakingAmount.args,
                        );
                await expect(fillOrderTx()).to.be.revertedWithCustomError(lopswap, 'InvalidatedPool');
            });
        }

        describe('AB order used case', async function () {
            await invalidatePool('AB');
        });

        describe('BA order used case', async function () {
            await invalidatePool('BA');
        });
    });

    describe('setLiquidity', async function () {
        async function setLiquidity(ABorBA) {
            it('should revert if someone except maker try', async function () {
                const {
                    accounts: { bob },
                    lopswap,
                    lopapool,
                } = await loadFixture(initContractsWithInitPoolWithType);
                await expect(lopswap.connect(bob).setLiquidity(lopapool[ABorBA].order, [], [])).to.be.revertedWithCustomError(lopswap, 'AccessDenied');
            });

            it('should revert if tokens array and amounts array lengths are different', async function () {
                const { tokens, lopswap, lopapool } = await loadFixture(initContractsWithInitPoolWithType);
                await expect(lopswap.setLiquidity(lopapool[ABorBA].order, [tokens.MKR], [0n, 0n])).to.be.revertedWithCustomError(lopswap, 'InvalidParams');
                await expect(lopswap.setLiquidity(lopapool[ABorBA].order, [tokens.MKR, tokens.TKR], [0n])).to.be.revertedWithCustomError(
                    lopswap,
                    'InvalidParams',
                );
            });

            it('should revert if pool still does not inited', async function () {
                const { lopswap, lopapool } = await loadFixture(initContractsAndPreparePoolWithType);
                await expect(lopswap.setLiquidity(lopapool[ABorBA].order, [], [])).to.be.revertedWithCustomError(lopswap, 'NotInitializedPool');
            });

            it('should revert if token does not belong order', async function () {
                const { tokens, lopswap, lopapool } = await loadFixture(initContractsWithInitPoolWithType);
                await expect(lopswap.setLiquidity(lopapool[ABorBA].order, [tokens.AAA], [1n])).to.be.revertedWithCustomError(lopswap, 'InvalidParams');
            });

            it('should increase pool balances', async function () {
                const { tokens, lopswap, lopapool } = await loadFixture(initContractsWithInitPoolWithType);
                const [mkrAssetAmount, tkrAssetAmount] = [1n, 2n];
                await lopswap.setLiquidity(lopapool[ABorBA].order, ABorBA === 'AB' ? [tokens.MKR, tokens.TKR] : [tokens.TKR, tokens.MKR], [
                    mkrAssetAmount,
                    tkrAssetAmount,
                ]);
                expect(await lopswap.balances(lopapool.id, lopapool[ABorBA].order.makerAsset)).to.be.equal(mkrAssetAmount);
                expect(await lopswap.balances(lopapool.id, lopapool[ABorBA].order.takerAsset)).to.be.equal(tkrAssetAmount);
            });
        }

        describe('AB order used case', async function () {
            await setLiquidity('AB');
        });

        describe('BA order used case', async function () {
            await setLiquidity('BA');
        });
    });

    describe('should pay correct amounts to maker and taker', async function () {
        for (const { direction, makerTokenName, takerTokenName } of [
            { direction: 'AB', makerTokenName: 'MKR', takerTokenName: 'TKR' },
            { direction: 'BA', makerTokenName: 'TKR', takerTokenName: 'MKR' },
        ]) {
            for (const fillByMakingAmount of [false, true]) {
                const amountType = fillByMakingAmount ? 'makingAmount' : 'takingAmount';

                it(`should settle ${direction} order correctly when filled by ${amountType}`, async function () {
                    const {
                        accounts: { bob },
                        tokens,
                        inch,
                        lopapool,
                    } = await loadFixture(initContractsWithInitPoolWithType);
                    const pool = lopapool[direction];
                    const makerToken = tokens[makerTokenName];
                    const takerToken = tokens[takerTokenName];
                    const specifiedAmount = (fillByMakingAmount ? makerToken : takerToken).parseAmount('1');
                    const balancesBefore = {
                        makerMakerAsset: await makerToken.balanceOf(pool.order.maker),
                        makerTakerAsset: await takerToken.balanceOf(pool.order.maker),
                        takerMakerAsset: await makerToken.balanceOf(bob),
                        takerTakerAsset: await takerToken.balanceOf(bob),
                    };
                    const takerTraits = fillByMakingAmount ? pool.takerTraitsForMakingAmount : pool.takerTraitsForTakingAmount;

                    await inch
                        .connect(bob)
                        .fillOrderArgs(pool.order, pool.signature.r, pool.signature.vs, specifiedAmount, takerTraits.traits, takerTraits.args);

                    const balancesAfter = {
                        makerMakerAsset: await makerToken.balanceOf(pool.order.maker),
                        makerTakerAsset: await takerToken.balanceOf(pool.order.maker),
                        takerMakerAsset: await makerToken.balanceOf(bob),
                        takerTakerAsset: await takerToken.balanceOf(bob),
                    };
                    const makingAmount = balancesBefore.makerMakerAsset - balancesAfter.makerMakerAsset;
                    const takingAmount = balancesAfter.makerTakerAsset - balancesBefore.makerTakerAsset;
                    expect(balancesAfter.takerMakerAsset - balancesBefore.takerMakerAsset).to.equal(makingAmount);
                    expect(balancesBefore.takerTakerAsset - balancesAfter.takerTakerAsset).to.equal(takingAmount);
                    expect(fillByMakingAmount ? makingAmount : takingAmount).to.equal(specifiedAmount);
                });
            }
        }
    });

    describe('getReturnMakingAmount', async function () {
        it('should return the amount should be converted to', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool: { AB: pool },
            } = await loadFixture(initContractsWithInitPoolWithType);
            const returnedMakingAmount = await lopswap.getReturnMakingAmount(pool.order, tokens.TKR.parseAmount('1'));
            const fillOrderTx = async () =>
                inch
                    .connect(bob)
                    .fillOrderArgs(
                        pool.order,
                        pool.signature.r,
                        pool.signature.vs,
                        tokens.TKR.parseAmount('1'),
                        pool.takerTraitsForTakingAmount.traits,
                        pool.takerTraitsForTakingAmount.args,
                    );
            const [returned] = await trackReceivedTokenAndTx(ethers.provider, tokens.MKR, bob.address, fillOrderTx);
            expect(returnedMakingAmount).to.be.equal(returned);
        });
    });

    describe('getReturnTakingAmount', async function () {
        it('should return the amount of takerAsset which taker should convert to makerAsset', async function () {
            const {
                accounts: { bob },
                tokens,
                lopswap,
                inch,
                lopapool: { AB: pool },
            } = await loadFixture(initContractsWithInitPoolWithType);
            const makingAmount = tokens.MKR.parseAmount('1');
            const takingAmount = await lopswap.getReturnTakingAmount(pool.order, makingAmount);
            const fillOrderTx = async () =>
                inch
                    .connect(bob)
                    .fillOrderArgs(
                        pool.order,
                        pool.signature.r,
                        pool.signature.vs,
                        makingAmount,
                        pool.takerTraitsForMakingAmount.traits,
                        pool.takerTraitsForMakingAmount.args,
                    );
            const [returned] = await trackReceivedTokenAndTx(ethers.provider, tokens.TKR, bob.address, fillOrderTx);
            expect(takingAmount).to.be.equal(-returned);
        });
    });
}

export { basePoolBehavioralTests };
