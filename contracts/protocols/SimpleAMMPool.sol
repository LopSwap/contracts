// SPDX-License-Identifier: LicenseRef-LOPSwap-Source-1.0
// License: https://github.com/LopSwap/contracts/blob/master/LICENSE.md

pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IOrderMixin } from "@1inch/limit-order-protocol-contract/contracts/interfaces/IOrderMixin.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { Address, AddressLib } from "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import { SafeERC20 } from "@1inch/solidity-utils/contracts/libraries/SafeERC20.sol";
import { OrderSaltLib } from "../libs/OrderSaltLib.sol";
import { LOPSwap } from "../LOPSwap.sol";

/**
 * @title SimpleAMMPool contract
 * @notice Contract for typical AMM pools with the common formula `a * b = const`
 */
contract SimpleAMMPool is LOPSwap {
    using AddressLib for Address;
    using SafeERC20 for IERC20;
    using OrderSaltLib for uint256;

    // Balances of makerAsset and takerAsset in the pool
    // Pool ID is equals to `keccak256(salt, maker, makerAsset, takerAsset)` where assets are sorted
    mapping(bytes32 => mapping(address => uint256)) public balances;

    constructor(address limitOrderProtocol, address owner) LOPSwap(limitOrderProtocol, owner) {} // solhint-disable-line no-empty-blocks

    /// @notice See {LOPSwap-_getBalance}
    function _getBalance(bytes32 lopapool, address asset) internal view virtual override returns (uint256) {
        return balances[lopapool][asset];
    }

    /// @notice See {LOPSwap-_setBalance}
    function _setBalance(bytes32 lopapool, address asset, uint256 amount) internal virtual override {
        balances[lopapool][asset] = amount;
    }

    /// @notice See {LOPSwap-_initializeBalances}
    function _initializeBalances(
        bytes32 lopapool,
        IOrderMixin.Order calldata order,
        bytes calldata /* extension */,
        bytes32 /* orderHash */,
        address /* taker */,
        uint256 /* makingAmount */,
        uint256 /* takingAmount */,
        uint256 /* remainingMakingAmount */,
        bytes calldata /* extraData */
    ) internal virtual override {
        _setBalance(lopapool, order.makerAsset.get(), ~order.makingAmount);
        _setBalance(lopapool, order.takerAsset.get(), ~order.takingAmount);
    }

    /// @notice See {LOPSwap-_transferAssetAndFee}
    function _transferAssetAndFee(
        bytes32 /* lopapool */,
        IOrderMixin.Order calldata order,
        address /* taker */,
        uint256 /* makingAmount */,
        uint256 takingAmount,
        bytes calldata extraData
    ) internal virtual override returns (uint256 protocolFeeAmount, uint256 providerFeeAmount) {
        // Protocol fee
        protocolFeeAmount = _transferProtocolFee(order.takerAsset.get(), takingAmount);
        // Provider fee
        providerFeeAmount = Math.mulDiv(takingAmount, order.salt.providerFee(), FEE_BASE);
        address providerFeeRecipient = !order.salt.isProviderFeeReceiverMaker() && extraData.length >= 20
            ? address(bytes20(extraData)) : order.maker.get();
        IERC20(order.takerAsset.get()).safeTransfer(providerFeeRecipient, providerFeeAmount);
        // Transfer remaining amount to maker
        IERC20(order.takerAsset.get()).safeTransfer(order.maker.get(), takingAmount - providerFeeAmount - protocolFeeAmount);
    }

    /// @notice See {LOPSwap-_preUpdateBalances}
    function _preUpdateBalances(
        bytes32 lopapool,
        IOrderMixin.Order calldata order,
        address /* taker */,
        uint256 makingAmount,
        uint256 takingAmount
    ) internal virtual override {
        uint256 amountWithoutFee = Math.mulDiv(takingAmount, FEE_BASE - order.salt.providerFee() - protocolFee, FEE_BASE);
        _setBalance(lopapool, order.makerAsset.get(), _getBalance(lopapool, order.makerAsset.get()) - makingAmount);
        _setBalance(lopapool, order.takerAsset.get(), _getBalance(lopapool, order.takerAsset.get()) + amountWithoutFee);
    }

    /// @notice See {LOPSwap-_postUpdateBalances}
    function _postUpdateBalances(
        bytes32 /* lopapool */,
        uint256 /* protocolFeeAmount */,
        uint256 /* providerFeeAmount */,
        IOrderMixin.Order calldata /* order */,
        address /* taker */,
        uint256 /* makingAmount */,
        uint256 /* takingAmount */
    ) internal virtual override { // solhint-disable-line no-empty-blocks
        // Do nothing;
    }

    /// @notice See {LOPSwap-_getMakingAmount}
    function _getMakingAmount(
        bytes32 /* lopapool */,
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
        /**
         * a * b = const
         * 1) balanceIn * balanceOut = const
         * 2) (balanceIn + amountWithFee) * (balanceOut − amountOut) = const
         * 3) From items 1,2:
         *      balanceIn * balanceOut = (balanceIn + amountWithFee) * (balanceOut − amountOut)
         *      (balanceOut − amountOut) = balanceIn * balanceOut / (balanceIn + amountWithFee)
         *      amountOut = balanceOut - balanceIn * balanceOut / (balanceIn + amountWithFee)
         *      amountOut = [ balanceOut * (balanceIn + amountWithFee) - balanceIn * balanceOut ] / (balanceIn + amountWithFee)
         *      amountOut = balanceOut * (balanceIn + amountWithFee - balanceIn) / (balanceIn + amountWithFee)
         *      amooutOut = balanceOut * amountWithFee / (balanceIn + amountWithFee)
         */
        uint256 amountWithFee = Math.mulDiv(amountIn, FEE_BASE - order.salt.providerFee() - protocolFee, FEE_BASE);
        return Math.mulDiv(balanceOut, amountWithFee, balanceIn + amountWithFee);
    }

    /// @notice See {LOPSwap-_getTakingAmount}
    function _getTakingAmount(
        bytes32 /* lopapool */,
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
        /**
         * a * b = const
         * 1) balanceIn * balanceOut = const
         * 2) (balanceIn + amountWithFee) * (balanceOut − amountOut) = const
         * 3) amountWithFee = amountIn * (FEE_BASE - providerFee - protocolFee) / FEE_BASE
         * 4) From items 2,3:
         *      (balanceIn + amountIn * (FEE_BASE - providerFee - protocolFee) / FEE_BASE) * (balanceOut − amountOut) = const
         * 5) From items 1,4:
         *      (balanceIn + amountIn * (FEE_BASE - providerFee - protocolFee) / FEE_BASE) * (balanceOut − amountOut) = balanceIn * balanceOut
         *      balanceIn + amountIn * (FEE_BASE - providerFee - protocolFee) / FEE_BASE = balanceIn * balanceOut / (balanceOut − amountOut)
         *      amountIn * (FEE_BASE - providerFee - protocolFee) / FEE_BASE = balanceIn * balanceOut / (balanceOut − amountOut) - balanceIn
         *      amountIn * (FEE_BASE - providerFee - protocolFee) / FEE_BASE = [balanceIn * balanceOut - balanceIn * (balanceOut − amountOut)] / (balanceOut − amountOut)
         *      amountIn * (FEE_BASE - providerFee - protocolFee) / FEE_BASE = balanceIn * amountOut / (balanceOut − amountOut)
         *      amountIn = balanceIn * amountOut * FEE_BASE / [(balanceOut − amountOut) * (FEE_BASE - providerFee - protocolFee)]
         */
        return Math.mulDiv(
            Math.mulDiv(
                balanceIn,
                amountOut,
                balanceOut - amountOut,
                Math.Rounding.Ceil
            ),
            FEE_BASE,
            FEE_BASE - order.salt.providerFee() - protocolFee,
            Math.Rounding.Ceil
        );
    }

    /// @notice See {LOPSwap-_getPoolBalances}
    function _getPoolBalances(bytes32 lopapool, address makerAsset, address takerAsset)
        internal view virtual override returns (uint256 /* makerAssetBalance */, uint256 /* takerAssetBalance */)
    {
        return (balances[lopapool][makerAsset], balances[lopapool][takerAsset]);
    }
}
