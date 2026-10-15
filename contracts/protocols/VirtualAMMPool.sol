// SPDX-License-Identifier: LicenseRef-LOPSwap-Source-1.0
// License: https://github.com/LopSwap/contracts/blob/master/LICENSE.md

/*
 * Portions of this source code are taken from `@1inch/mooniswap`
 * https://github.com/1inch/mooniswap/blob/master/contracts/Mooniswap.sol
 *
 * Those portions are licensed under the MIT License.
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

pragma solidity 0.8.26;

import { IOrderMixin } from "@1inch/limit-order-protocol-contract/contracts/interfaces/IOrderMixin.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { Address, AddressLib } from "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import { VirtualBalance } from "../libs/VirtualBalance.sol";
import { OrderSaltLib } from "../libs/OrderSaltLib.sol";
import { SimpleAMMPool } from "./SimpleAMMPool.sol";

/**
 * @title VirtualAMMPool contract
 * @notice AMM based on Mooniswap's virtual-balance mechanism.
 */
contract VirtualAMMPool is SimpleAMMPool {
    using AddressLib for Address;
    using VirtualBalance for VirtualBalance.Data;
    using OrderSaltLib for uint256;

    constructor(address limitOrderProtocol, address owner) SimpleAMMPool(limitOrderProtocol, owner) {} // solhint-disable-line no-empty-blocks

    // Virtual balances of makerAsset and takerAsset from order by lopapool
    mapping(bytes32 => mapping(address => VirtualBalance.Data)) public virtualBalancesForAddition;
    mapping(bytes32 => mapping(address => VirtualBalance.Data)) public virtualBalancesForRemoval;

    function getBalanceForAddition(bytes32 lopapool, address token) public view returns(uint256) {
        uint256 balance = balances[lopapool][token];
        return Math.max(virtualBalancesForAddition[lopapool][token].current(balance), balance);
    }

    function getBalanceForRemoval(bytes32 lopapool, address token) public view returns(uint256) {
        uint256 balance =  balances[lopapool][token];
        return Math.min(virtualBalancesForRemoval[lopapool][token].current(balance), balance);
    }

    /**
     * @notice See {LOPSwap-_getMakingAmount}
     * @dev Adaptation of Mooniswap `swap` method
     * https://github.com/1inch/mooniswap/blob/master/contracts/Mooniswap.sol#L214
     */
    function _getMakingAmount(
        bytes32 lopapool,
        uint256 balanceIn,
        uint256 balanceOut,
        IOrderMixin.Order calldata order,
        bytes calldata /* extension */,
        bytes32 /* orderHash */,
        address /* taker */,
        uint256 amountIn,
        uint256 /* remainingMakingAmount */,
        bytes calldata /* extraData */
    ) internal view virtual override returns (uint256 /* amountOut */) {
        (uint256 srcAdditionBalance, uint256 dstRemovalBalance) = _getAdditionAndRemovalBalances(lopapool, order.takerAsset.get(), order.makerAsset.get(), balanceIn, balanceOut);
        uint256 amountWithFee = Math.mulDiv(
            amountIn,
            FEE_BASE - order.salt.providerFee() - protocolFee,
            FEE_BASE
        );
        return Math.mulDiv(
            amountWithFee,
            dstRemovalBalance,
            srcAdditionBalance + amountWithFee
        );
    }

    /**
     * @notice See {LOPSwap-_getTakingAmount}
     * @dev Adaptation of Mooniswap `swap` method
     * https://github.com/1inch/mooniswap/blob/master/contracts/Mooniswap.sol#L214
     */
    function _getTakingAmount(
        bytes32 lopapool,
        uint256 balanceIn,
        uint256 balanceOut,
        IOrderMixin.Order calldata order,
        bytes calldata /* extension */,
        bytes32 /* orderHash */,
        address /* taker */,
        uint256 amountOut,
        uint256 /* remainingMakingAmount */,
        bytes calldata /* extraData */
    ) internal view virtual override returns (uint256 /* amountIn */) {
        (uint256 srcAdditionBalance, uint256 dstRemovalBalance) = _getAdditionAndRemovalBalances(lopapool, order.takerAsset.get(), order.makerAsset.get(), balanceIn, balanceOut);
        return Math.mulDiv(
            Math.mulDiv(
                srcAdditionBalance,
                amountOut,
                dstRemovalBalance - amountOut,
                Math.Rounding.Ceil
            ),
            FEE_BASE,
            FEE_BASE - order.salt.providerFee() - protocolFee,
            Math.Rounding.Ceil
        );
    }

    function _getAdditionAndRemovalBalances(bytes32 lopapool, address takerAsset, address makerAsset, uint256 balanceIn, uint256 balanceOut)
        private view returns (uint256 srcAdditionBalance, uint256 dstRemovalBalance)
    {
        // catch possible airdrops and external balance changes for deflationary tokens
        srcAdditionBalance = Math.max(virtualBalancesForAddition[lopapool][takerAsset].current(balanceIn), balanceIn);
        dstRemovalBalance = Math.min(virtualBalancesForRemoval[lopapool][makerAsset].current(balanceOut), balanceOut);
    }

    function _preUpdateBalances(
        bytes32 lopapool,
        IOrderMixin.Order calldata order,
        address /* taker */,
        uint256 makingAmount,
        uint256 takingAmount
    ) internal virtual override {
        uint256 balanceIn = _getBalance(lopapool, order.takerAsset.get());
        uint256 balanceOut = _getBalance(lopapool, order.makerAsset.get());

        // catch possible airdrops and external balance changes for deflationary tokens
        uint256 srcAdditionBalance = Math.max(virtualBalancesForAddition[lopapool][order.takerAsset.get()].current(balanceIn), balanceIn);
        uint256 dstRemovalBalance = Math.min(virtualBalancesForRemoval[lopapool][order.makerAsset.get()].current(balanceOut), balanceOut);

        // Update virtual balances to the same direction only at imbalanced state
        uint256 amountWithoutFee = Math.mulDiv(takingAmount, FEE_BASE - order.salt.providerFee() - protocolFee, FEE_BASE);
        if (srcAdditionBalance != balanceIn) {
            virtualBalancesForAddition[lopapool][order.takerAsset.get()].set(srcAdditionBalance + amountWithoutFee);
        }
        if (dstRemovalBalance != balanceOut) {
            virtualBalancesForRemoval[lopapool][order.makerAsset.get()].set(dstRemovalBalance - makingAmount);
        }

        // Update virtual balances to the opposite direction
        virtualBalancesForRemoval[lopapool][order.takerAsset.get()].update(balanceIn);
        virtualBalancesForAddition[lopapool][order.makerAsset.get()].update(balanceOut);

        // Update balances
        _setBalance(lopapool, order.makerAsset.get(), balanceOut - makingAmount);
        _setBalance(lopapool, order.takerAsset.get(), balanceIn + amountWithoutFee);
    }

    function _getPoolBalances(bytes32 lopapool, address makerAsset, address takerAsset)
        internal view virtual override returns (uint256 /* makerAssetBalance */, uint256 /* takerAssetBalance */)
    {
        return (getBalanceForRemoval(lopapool, makerAsset), getBalanceForAddition(lopapool, takerAsset));
    }
}
