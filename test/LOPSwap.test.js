import { ethers, expect, loadFixture } from '@1inch/solidity-utils';

import { initContracts, initContractsAndPreparePool, initContractsWithInitPool } from './helpers/fixtures.js';
import { getProviderFee, PoolType } from './helpers/orders.js';

describe('LOPSwap', async function () {
    describe('Onwer methods and control protocol', async function () {
        it('should receive ETH on extension', async function () {
            const {
                accounts: { alice },
                tokens,
                lopswapMap,
            } = await loadFixture(initContracts);
            const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
            await expect(alice.sendTransaction({ to: lopswap, value: tokens.ETH.parseAmount('1') })).to.be.changeEtherBalances(
                ethers,
                [alice, lopswap],
                [tokens.ETH.parseAmount('-1'), tokens.ETH.parseAmount('1')],
            );
        });

        describe('Rescue funds from extension', async function () {
            it('should revert if non-owner try to rescue', async function () {
                const {
                    accounts: { alice },
                    tokens,
                    lopswapMap,
                } = await loadFixture(initContracts);
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
                await expect(lopswap.connect(alice).rescueFunds(tokens.ETH.target, tokens.ETH.parseAmount('0.01'))).to.be.revertedWithCustomError(
                    lopswap,
                    'OwnableUnauthorizedAccount',
                );
            });

            it('should rescue a specified amount of ETH funds', async function () {
                const {
                    accounts: { alice, owner },
                    tokens,
                    lopswapMap,
                } = await loadFixture(initContracts);
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
                await alice.sendTransaction({ to: lopswap, value: tokens.ETH.parseAmount('1') });
                await expect(lopswap.connect(owner).rescueFunds(tokens.ETH.target, tokens.ETH.parseAmount('0.01'))).to.be.changeEtherBalances(
                    ethers,
                    [lopswap, owner],
                    [tokens.ETH.parseAmount('-0.01'), tokens.ETH.parseAmount('0.01')],
                );
            });

            it('should rescue all amount of ETH funds', async function () {
                const {
                    accounts: { alice, owner },
                    tokens,
                    lopswapMap,
                } = await loadFixture(initContracts);
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
                await alice.sendTransaction({ to: lopswap, value: tokens.ETH.parseAmount('1') });
                await expect(lopswap.connect(owner).rescueFunds(tokens.ETH.target, '0')).to.be.changeEtherBalances(
                    ethers,
                    [lopswap, owner],
                    [tokens.ETH.parseAmount('-1'), tokens.ETH.parseAmount('1')],
                );
                expect(await ethers.provider.getBalance(lopswap.target)).to.be.equal('0');
            });

            it('should rescue a specified amount of token funds', async function () {
                const {
                    accounts: { owner },
                    tokens,
                    lopswapMap,
                } = await loadFixture(initContracts);
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
                await tokens.MKR.transfer(lopswap, tokens.MKR.parseAmount('1'));
                await expect(lopswap.connect(owner).rescueFunds(tokens.MKR.target, tokens.MKR.parseAmount('0.01'))).to.be.changeTokenBalances(
                    ethers,
                    tokens.MKR,
                    [lopswap, owner],
                    [tokens.MKR.parseAmount('-0.01'), tokens.MKR.parseAmount('0.01')],
                );
            });

            it('should rescue all amount of token funds', async function () {
                const {
                    accounts: { owner },
                    tokens,
                    lopswapMap,
                } = await loadFixture(initContracts);
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
                await tokens.MKR.transfer(lopswap, tokens.MKR.parseAmount('1'));
                await expect(lopswap.connect(owner).rescueFunds(tokens.MKR.target, '0')).to.be.changeTokenBalances(
                    ethers,
                    tokens.MKR,
                    [lopswap, owner],
                    [tokens.MKR.parseAmount('-1'), tokens.MKR.parseAmount('1')],
                );
                expect(await tokens.MKR.balanceOf(lopswap)).to.be.equal('0');
            });
        });

        describe('Pause protocol', async function () {
            it('should revert if non-owner try to use pause method', async function () {
                const {
                    accounts: { alice },
                    lopswapMap,
                } = await loadFixture(initContracts);
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
                await expect(lopswap.connect(alice).pause(true)).to.be.revertedWithCustomError(lopswap, 'OwnableUnauthorizedAccount');
            });

            it('should paused protocol and does not fill orders', async function () {
                const {
                    accounts: { bob, owner },
                    tokens,
                    lopswapMap,
                    inch,
                    lopapool: { AB: pool },
                } = await loadFixture(initContractsAndPreparePool);
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];

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
                // should fill order before pause
                await fillOrderTx();
                // should pause protocol
                await lopswap.connect(owner).pause(true);
                await expect(fillOrderTx()).to.be.revertedWithCustomError(lopswap, 'AccessDenied');
            });

            it('should unpaused protocol and fill orders', async function () {
                const {
                    accounts: { bob, owner },
                    tokens,
                    lopswapMap,
                    inch,
                    lopapool: { AB: pool },
                } = await loadFixture(initContractsAndPreparePool);
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];

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
                // shouldn't fill order after pause
                await lopswap.connect(owner).pause(true);
                await expect(fillOrderTx()).to.be.revertedWithCustomError(lopswap, 'AccessDenied');
                // should fill order after unpause
                await lopswap.connect(owner).pause(false);
                await fillOrderTx();
            });
        });

        describe('Protocol fee', async function () {
            it('should revert if protocol fee is greater than FEE_BASE', async function () {
                const {
                    accounts: { owner },
                    lopswapMap,
                } = await loadFixture(initContracts);
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
                const baseFee = await lopswap.FEE_BASE();

                await expect(lopswap.connect(owner).setProtocolFee(baseFee + 1n, owner.address)).to.be.revertedWithCustomError(lopswap, 'InvalidParams');
            });

            it('should revert if protocol fee recipient is zero address', async function () {
                const {
                    accounts: { owner },
                    lopswapMap,
                } = await loadFixture(initContracts);
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];

                await expect(lopswap.connect(owner).setProtocolFee(1n, ethers.ZeroAddress)).to.be.revertedWithCustomError(lopswap, 'InvalidParams');
            });
        });
    });

    describe('Common methods', async function () {
        it('should return contract version', async function () {
            const { lopswapMap } = await loadFixture(initContracts);
            for (const lopswap of Object.values(lopswapMap)) {
                expect(await lopswap.version()).to.equal(1n);
            }
        });

        it('should revert if preInteraction is not called by Limit Order Protocol', async function () {
            const {
                accounts: { alice },
                lopswap,
                lopapool: { AB: pool },
            } = await loadFixture(initContractsAndPreparePool);

            await expect(
                lopswap.connect(alice).preInteraction(pool.order, pool.order.extension, ethers.ZeroHash, alice.address, 1n, 1n, 0n, '0x'),
            ).to.be.revertedWithCustomError(lopswap, 'OnlyLimitOrderProtocol');
        });

        it('should revert getTakingAmount if total fee is equal to FEE_BASE', async function () {
            const {
                accounts: { bob, owner },
                lopswap,
                lopapool: { AB: pool },
            } = await loadFixture(initContractsAndPreparePool);
            const baseFee = await lopswap.FEE_BASE();
            await lopswap.connect(owner).setProtocolFee(baseFee - getProviderFee(pool.order), owner.address);

            await expect(lopswap.getTakingAmount(pool.order, pool.order.extension, ethers.ZeroHash, bob.address, 1n, 0n, '0x')).to.be.revertedWithCustomError(
                lopswap,
                'FeesTooHigh',
            );
        });

        async function getBalancesTests(ABorBA) {
            it('should return correct balances', async function () {
                const fixtureData = await loadFixture(initContractsWithInitPool);
                const { lopswapMap, initBalances } = fixtureData;
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
                const pool = fixtureData.lopapool[ABorBA];
                const balances = await lopswap.getBalances(pool.order);
                // pool balances
                expect(balances.slice(0, 2)).to.be.deep.equal([initBalances[ABorBA].makerAssetAmount, initBalances[ABorBA].takerAssetAmount]);
                // user balances including approves
                expect(balances.slice(2, 4)).to.be.deep.equal([initBalances[ABorBA].makerAssetAmount, initBalances[ABorBA].takerAssetAmount]);
            });

            it('should return correct balances after user lost tokens from account', async function () {
                const fixtureData = await loadFixture(initContractsWithInitPool);
                const {
                    accounts: { alice, bob },
                    tokens,
                    lopswapMap,
                    initBalances,
                } = fixtureData;
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
                const pool = fixtureData.lopapool[ABorBA];
                await tokens.MKR.connect(alice).transfer(bob, await tokens.MKR.balanceOf(alice));
                await tokens.TKR.connect(alice).transfer(bob, (await tokens.TKR.balanceOf(alice)) - 1n);
                const balances = await lopswap.getBalances(pool.order);
                // pool balances
                expect(balances.slice(0, 2)).to.be.deep.equal([initBalances[ABorBA].makerAssetAmount, initBalances[ABorBA].takerAssetAmount]);
                // user balances including approves
                expect(balances.slice(2, 4)).to.be.deep.equal(ABorBA === 'AB' ? [0n, 1n] : [1n, 0n]);
            });

            it('should return correct balances after user changed approved amounts', async function () {
                const fixtureData = await loadFixture(initContractsWithInitPool);
                const {
                    accounts: { alice },
                    tokens,
                    inch,
                    lopswapMap,
                    initBalances,
                } = fixtureData;
                const lopswap = lopswapMap[PoolType.SIMPLE_AMM];
                const pool = fixtureData.lopapool[ABorBA];
                await tokens.MKR.connect(alice).approve(inch, 1);
                await tokens.TKR.connect(alice).approve(inch, 2);
                const balances = await lopswap.getBalances(pool.order);
                // pool balances
                expect(balances.slice(0, 2)).to.be.deep.equal([initBalances[ABorBA].makerAssetAmount, initBalances[ABorBA].takerAssetAmount]);
                // user balances including approves
                expect(balances.slice(2, 4)).to.be.deep.equal(ABorBA === 'AB' ? [1n, 2n] : [2n, 1n]);
            });
        }

        describe('should pass tests for AB pool', async function () {
            await getBalancesTests('AB');
        });

        describe('should pass tests for AB pool', async function () {
            await getBalancesTests('BA');
        });
    });
});
