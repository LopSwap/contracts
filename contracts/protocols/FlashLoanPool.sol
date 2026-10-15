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
 * @title FlashLoanPool contract
 * @notice Contract for flash loan pools
 * @dev This contract uses Erc20True token as a takerAsset to avoid extra operations,
 *      so the pool doesn't use takerAsset and related balance
 */
contract FlashLoanPool is LOPSwap {
    using AddressLib for Address;
    using SafeERC20 for IERC20;
    using OrderSaltLib for uint256;

    error InsufficientRepayment();

    // Balances of maker provided asset in the pool
    // Pool ID is equals to `keccak256(salt, maker, makerAsset)` where assets are sorted
    mapping(bytes32 => uint256) public balances;

    constructor(address limitOrderProtocol, address owner) LOPSwap(limitOrderProtocol, owner) {} // solhint-disable-line no-empty-blocks

    /// @notice See {LOPSwap-getPool}
    function getPool(IOrderMixin.Order calldata order) public pure virtual override returns (bytes32) {
        return keccak256(abi.encodePacked(order.salt, order.maker, order.makerAsset));
    }

    /// @notice See {LOPSwap-_getBalance}
    function _getBalance(bytes32 lopapool, address /* asset */) internal view virtual override returns (uint256) {
        return balances[lopapool];
    }

    /// @notice See {LOPSwap-setBalance}
    function _setBalance(bytes32 lopapool, address /* asset */, uint256 amount) internal virtual override {
        balances[lopapool] = amount;
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
        _setBalance(lopapool, address(0), ~order.makingAmount);
    }

    /// @notice See {LOPSwap-_transferAssetAndFee}
    function _transferAssetAndFee(
        bytes32 /* lopapool */,
        IOrderMixin.Order calldata order,
        address taker,
        uint256 /* makingAmount */,
        uint256 takingAmount,
        bytes calldata extraData
    ) internal virtual override returns (uint256 protocolFeeAmount, uint256 providerFeeAmount) {
        // Protocol fee
        protocolFeeAmount = _transferProtocolFee(order.takerAsset.get(), takingAmount);
        if (protocolFeeAmount > 0) {
            IERC20(order.makerAsset.get()).safeTransferFrom(taker, protocolFeeRecipient, protocolFeeAmount);
        }
        // Provider fee
        providerFeeAmount = Math.mulDiv(takingAmount, order.salt.providerFee(), FEE_BASE);
        address providerFeeRecipient = !order.salt.isProviderFeeReceiverMaker() && extraData.length >= 20
            ? address(bytes20(extraData)) : order.maker.get();
        IERC20(order.makerAsset.get()).safeTransferFrom(taker, providerFeeRecipient, providerFeeAmount);
        // Transfer remaining amount to maker
        IERC20(order.makerAsset.get()).safeTransferFrom(taker, order.maker.get(), takingAmount - providerFeeAmount - protocolFeeAmount);
    }

    /// @notice See {LOPSwap-_preUpdateBalances}
    function _preUpdateBalances(
        bytes32 lopapool,
        IOrderMixin.Order calldata order,
        address /* taker */,
        uint256 makingAmount,
        uint256 /* takingAmount */
    ) internal virtual override {
        _setBalance(lopapool, address(0), _getBalance(lopapool, order.makerAsset.get()) - makingAmount);
    }

    /// @notice See {LOPSwap-_postUpdateBalances}
    function _postUpdateBalances(
        bytes32 lopapool,
        uint256 /* protocolFeeAmount */,
        uint256 /* providerFeeAmount */,
        IOrderMixin.Order calldata order,
        address /* taker */,
        uint256 makingAmount,
        uint256 takingAmount
    ) internal virtual override { // solhint-disable-line no-empty-blocks
        uint256 amountWithoutFee = Math.mulDiv(takingAmount, FEE_BASE - order.salt.providerFee() - protocolFee, FEE_BASE, Math.Rounding.Ceil);
        if (amountWithoutFee < makingAmount) revert InsufficientRepayment();
        _setBalance(lopapool, address(0), _getBalance(lopapool, order.makerAsset.get()) + amountWithoutFee);
    }

    /// @notice See {LOPSwap-_getMakingAmount}
    function _getMakingAmount(
        bytes32 /* lopapool */,
        uint256 /* balanceIn */,
        uint256 balanceOut,
        IOrderMixin.Order calldata order,
        bytes calldata /* extension */,
        bytes32 /* orderHash */,
        address /* taker */,
        uint256 amountIn,
        uint256 /* remainingMakingAmount */,
        bytes calldata /* extraData */
    ) internal view virtual override returns (uint256 /* amountOut */) {
        uint256 amountOut = Math.mulDiv(amountIn, FEE_BASE - order.salt.providerFee() - protocolFee, FEE_BASE, Math.Rounding.Ceil);
        return Math.min(balanceOut, amountOut);
    }

    /// @notice See {LOPSwap-_getTakingAmount}
    function _getTakingAmount(
        bytes32 /* lopapool */,
        uint256 /* balanceIn */,
        uint256 balanceOut,
        IOrderMixin.Order calldata order,
        bytes calldata /* extension */,
        bytes32 /* orderHash */,
        address /* taker */,
        uint256 amountOut,
        uint256 /* remainingMakingAmount */,
        bytes calldata /* extraData */
    ) internal view virtual override returns (uint256 /* amountIn */) {
        return Math.mulDiv(
            Math.min(balanceOut, amountOut),
            FEE_BASE,
            FEE_BASE - order.salt.providerFee() - protocolFee
        );
    }

    /// @notice See {LOPSwap-_getPoolBalances}
    function _getPoolBalances(bytes32 lopapool, address /* makerAsset */, address /* takerAsset */)
        internal view virtual override returns (uint256 /* makerAssetBalance */, uint256 /* takerAssetBalance */)
    {
        return (balances[lopapool], 1);
    }
}
