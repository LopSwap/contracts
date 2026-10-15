// SPDX-License-Identifier: LicenseRef-LOPSwap-Source-1.0
// License: https://github.com/LopSwap/contracts/blob/master/LICENSE.md

pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAmountGetter } from "@1inch/limit-order-protocol-contract/contracts/interfaces/IAmountGetter.sol";
import { IOrderMixin } from "@1inch/limit-order-protocol-contract/contracts/interfaces/IOrderMixin.sol";
import { IPreInteraction } from "@1inch/limit-order-protocol-contract/contracts/interfaces/IPreInteraction.sol";
import { IPostInteraction } from "@1inch/limit-order-protocol-contract/contracts/interfaces/IPostInteraction.sol";

import { Address, AddressLib } from "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import { SafeERC20 } from "@1inch/solidity-utils/contracts/libraries/SafeERC20.sol";
import { UniERC20 } from "@1inch/solidity-utils/contracts/libraries/UniERC20.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { OrderSaltLib } from "./libs/OrderSaltLib.sol";

/**
 * @title LOPSwap contract
 * @author zzomrot
 * @notice Protocol with offchain liquidity pools used 1inch Limit Order Protocol.
 * @dev Contract for different protocols pool calculations with common implementation.
 * WARNING: Maker-controlled pools; rates may change via setLiquidity/invalidatePool.
 * Takers MUST set slippage protection, otherwise the tx may fail or execute at a worse rate.
 */
abstract contract LOPSwap is Ownable, IAmountGetter, IPreInteraction, IPostInteraction {
    using AddressLib for Address;
    using SafeERC20 for IERC20;
    using UniERC20 for IERC20;
    using OrderSaltLib for uint256;

    error OnlyLimitOrderProtocol();
    error InvalidatedPool();
    error NotEnoughLiquidity();
    error AccessDenied();
    error InvalidParams();
    error NotInitializedPool();
    error FeesTooHigh();

    /// @dev Emitted when the pause is triggered.
    event Paused();
    /// @dev Emitted when the pause is lifted.
    event Unpaused();

    enum PoolStatus {
        NEW,
        INITIALIZED,
        INVALIDATED
    }

    uint256 public constant FEE_BASE = 1e5;
    address public immutable LIMIT_ORDER_PROTOCOL;
    bool public paused;
    uint256 public protocolFee = 0;
    address public protocolFeeRecipient;

    // Mapping of pool statuses: initialized, invalidated
    mapping(bytes32 => uint256) public poolStatus;

    /// @dev Modifier to check if the caller is the limit order protocol contract.
    modifier onlyLimitOrderProtocol {
        if (msg.sender != LIMIT_ORDER_PROTOCOL) revert OnlyLimitOrderProtocol();
        _;
    }

    /**
     * @notice Initializes the contract.
     * @param limitOrderProtocol The 1inch limit order protocol contract.
     */
    constructor(address limitOrderProtocol, address owner) Ownable(owner) {
        LIMIT_ORDER_PROTOCOL = limitOrderProtocol;
        paused = false;
    }

    /// @dev Returns the balance of the specified asset in the specified pool
    function _getBalance(bytes32 lopapool, address asset) internal view virtual returns (uint256);

    /// @dev Sets the balance of the specified asset in the specified pool
    function _setBalance(bytes32 lopapool, address asset, uint256 amount) internal virtual;

    /**
     * @notice Sets the protocol fee.
     * @param fee The new protocol fee. The value is in base 1e5.
     * @param recipient The address of the protocol fee recipient.
     */
    function setProtocolFee(uint256 fee, address recipient) external onlyOwner {
        if (fee > FEE_BASE || recipient == address(0)) revert InvalidParams();
        protocolFee = fee;
        protocolFeeRecipient = recipient;
    }

    /**
     * @notice Calculates the pool ID (lopapool) from the order
     * @param order The order related to lopapool
     * @return pool The lopapool
     */
    function getPool(IOrderMixin.Order calldata order) public pure virtual returns (bytes32) {
        return order.makerAsset.get() < order.takerAsset.get()
            ? keccak256(abi.encodePacked(order.salt, order.maker, order.makerAsset, order.takerAsset))
            : keccak256(abi.encodePacked(order.salt, order.maker, order.takerAsset, order.makerAsset));
    }

    /**
     * @notice Shows pool's balances and available balances by order.
     * @param order The order related to lopapool.
     */
    function getBalances(IOrderMixin.Order calldata order)
        public view returns (uint256 makerAssetBalance, uint256 takerAssetBalance, uint256 availableMakerAssetBalance, uint256 availableTakerAssetBalance)
    {
        bytes32 lopapool = getPool(order);
        (makerAssetBalance, takerAssetBalance) = _getBalances(order, lopapool);
        availableMakerAssetBalance = Math.min(
            makerAssetBalance,
            Math.min(
                IERC20(order.makerAsset.get()).balanceOf(order.maker.get()),
                IERC20(order.makerAsset.get()).allowance(order.maker.get(), LIMIT_ORDER_PROTOCOL)
            )
        );
        availableTakerAssetBalance = Math.min(
            takerAssetBalance,
            Math.min(
                IERC20(order.takerAsset.get()).balanceOf(order.maker.get()),
                IERC20(order.takerAsset.get()).allowance(order.maker.get(), LIMIT_ORDER_PROTOCOL)
            )
        );
        return (makerAssetBalance, takerAssetBalance, availableMakerAssetBalance, availableTakerAssetBalance);
    }

    /**
     * @notice The amount of `amountIn` should be converted to
     * @dev This is correct only for AMM's that use only assets and amounts
     * @param order The order related to the pool which will be filled
     * @param amountIn The amount of takerAsset which taker will convert to makerAsset
     * @return {amountOut} The amount of the asset that will be received
     */
    function getReturnMakingAmount(
        IOrderMixin.Order calldata order,
        uint256 amountIn
    ) external view returns (uint256) {
        (bytes32 lopapool, uint256 makerAssetBalance, uint256 takerAssetBalance) = _getLopapoolWithBalances(order);
        bytes calldata nonUsedCalldata = _getNonUsedCalldata();
        return _getMakingAmount(lopapool, takerAssetBalance, makerAssetBalance, order, nonUsedCalldata, "0x", address(0), amountIn, 0, nonUsedCalldata);
    }

    /**
     * @notice The amount of takerAsset which taker should convert to makerAsset
     * @dev This is correct only for AMM's that use only assets and amounts
     * @param order The order related to the pool which will be filled
     * @param amountOut The amount of makerAsset that the taker will receive
     * @return {amountIn} The amount of takerAsset which taker should convert to makerAsset
     */
    function getReturnTakingAmount(
        IOrderMixin.Order calldata order,
        uint256 amountOut
    ) external view returns (uint256) {
        (bytes32 lopapool, uint256 makerAssetBalance, uint256 takerAssetBalance) = _getLopapoolWithBalances(order);
        bytes calldata nonUsedCalldata = _getNonUsedCalldata();
        return _getTakingAmount(lopapool, takerAssetBalance, makerAssetBalance, order, nonUsedCalldata, "0x", address(0), amountOut, 0, nonUsedCalldata);
    }

    function _getNonUsedCalldata() private pure returns (bytes calldata nonUsedCalldata){
        bytes memory nonUsedData = bytes("");
        assembly ("memory-safe") { // solhint-disable-line no-inline-assembly
            nonUsedCalldata.offset := add(nonUsedData, 0x20)
            nonUsedCalldata.length := mload(nonUsedData)
        }
    }

    /// @dev Check pool's balances of makerAsset and takerAsset before init pool
    function _getBalances(IOrderMixin.Order calldata order, bytes32 lopapool) internal view returns (uint256 makerAssetBalance, uint256 takerAssetBalance) {
        if (poolStatus[lopapool] == uint256(PoolStatus.NEW)) {
            makerAssetBalance = ~order.makingAmount;
            takerAssetBalance = ~order.takingAmount;
        } else {
            (makerAssetBalance, takerAssetBalance) = _getPoolBalances(lopapool, order.makerAsset.get(), order.takerAsset.get());
        }
    }

    /// @dev Return actual balances of makerAsset and takerAsset in the pool in the current state
    function _getPoolBalances(bytes32 lopapool, address makerAsset, address takerAsset)
        internal view virtual returns (uint256 makerAssetBalance, uint256 takerAssetBalance);

    /// @dev The common method for `getMakingAmount` and `getTakingAmount` to get data and check it
    function _getLopapoolWithBalances(IOrderMixin.Order calldata order) internal view returns (bytes32 lopapool, uint256 makerAssetBalance, uint256 takerAssetBalance) {
        lopapool = getPool(order);
        (makerAssetBalance, takerAssetBalance) = _getBalances(order, lopapool);
        if(makerAssetBalance == 0 || takerAssetBalance == 0) revert NotEnoughLiquidity();
    }

    /**
     * @notice Invalidate pool by order. Only `maker` and `owner` can call this method.
     * @dev Allows invalidating both reciprocal orders in a single transaction instead of two separate invalidations in the 1inch LOP protocol.
     * @param order The order from the lopapool
     */
    function invalidatePool(IOrderMixin.Order calldata order) external {
        if (msg.sender != order.maker.get() && msg.sender != owner()) revert AccessDenied();
        poolStatus[getPool(order)] = uint256(PoolStatus.INVALIDATED);
    }

    /**
     * @notice Sets the liquidity for the pool by pool's creator.
     * @param order The order related to the pool
     * @param assets The list of assets to set balances for
     * @param amounts The list of amounts to set balances for
     */
    function setLiquidity(IOrderMixin.Order calldata order, address[] memory assets, uint256[] memory amounts) external {
        if (msg.sender != order.maker.get()) revert AccessDenied();
        if (assets.length != amounts.length) revert InvalidParams();
        bytes32 lopapool = getPool(order);
        if (poolStatus[lopapool] == uint256(PoolStatus.NEW)) revert NotInitializedPool();
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] != order.makerAsset.get() && assets[i] != order.takerAsset.get()) revert InvalidParams();
            _setBalance(lopapool, assets[i], amounts[i]);
        }
    }

    /// @dev Initializes balances during first interaction with the lopapool
    function _initializeBalances(
        bytes32 lopapool,
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) internal virtual;

    /// @dev Transfer special token as protocol fee
    function _transferProtocolFee(address asset, uint256 assetAmount) internal virtual returns (uint256 protocolFeeAmount) {
        protocolFeeAmount = Math.mulDiv(assetAmount, protocolFee, FEE_BASE);
        if (protocolFeeAmount > 0) {
            IERC20(asset).safeTransfer(protocolFeeRecipient, protocolFeeAmount);
        }
    }

    /// @dev Transfers assets and fees from taker to maker
    function _transferAssetAndFee(
        bytes32 lopapool,
        IOrderMixin.Order calldata order,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        bytes calldata extraData
    ) internal virtual returns (uint256 protocolFeeAmount, uint256 providerFeeAmount);

    /// @dev Updates balances after interaction with the pool
    function _preUpdateBalances(
        bytes32 lopapool,
        IOrderMixin.Order calldata order,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount
    ) internal virtual;

    /// @dev Updates balances after interaction with the pool
    function _postUpdateBalances(
        bytes32 lopapool,
        uint256 protocolFeeAmount,
        uint256 providerFeeAmount,
        IOrderMixin.Order calldata order,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount
    ) internal virtual;

    /**
     * ==================== LIMIT ORDER PROTOCOL METHODS ====================
     */

    /// @notice See {IAmountGetter-getMakingAmount}.
    function getMakingAmount(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external view returns (uint256 calculatedMakingAmount) {
        if (order.salt.providerFee() + protocolFee >= FEE_BASE) revert FeesTooHigh();
        (bytes32 lopapool, uint256 makerAssetBalance, uint256 takerAssetBalance) = _getLopapoolWithBalances(order);
        return _getMakingAmount(lopapool, takerAssetBalance, makerAssetBalance, order, extension, orderHash, taker, takingAmount, remainingMakingAmount, extraData);
    }

    /// @notice See {IAmountGetter-getTakingAmount}.
    function getTakingAmount(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external view returns (uint256 calculatedTakingAmount) {
        if (order.salt.providerFee() + protocolFee >= FEE_BASE) revert FeesTooHigh();
        (bytes32 lopapool, uint256 makerAssetBalance, uint256 takerAssetBalance) = _getLopapoolWithBalances(order);
        return _getTakingAmount(lopapool, takerAssetBalance, makerAssetBalance, order, extension, orderHash, taker, makingAmount, remainingMakingAmount, extraData);
    }

    /**
     * @notice See {IPreInteraction-postInteraction}.
     */
    function preInteraction(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external onlyLimitOrderProtocol {
        if (paused) revert AccessDenied();

        bytes32 lopapool = getPool(order);
        // Init pool if it's new
        if (poolStatus[lopapool] == uint256(PoolStatus.INVALIDATED)) revert InvalidatedPool();
        if (poolStatus[lopapool] == uint256(PoolStatus.NEW)) {
            poolStatus[lopapool] = uint256(PoolStatus.INITIALIZED);
            _initializeBalances(lopapool, order, extension, orderHash, taker, makingAmount, takingAmount, remainingMakingAmount, extraData);
        }
        if (makingAmount >= _getBalance(lopapool, order.makerAsset.get())) revert NotEnoughLiquidity();

        // Update pool to avoid reentancy using the same balances
        _preUpdateBalances(getPool(order), order, taker, makingAmount, takingAmount);
    }

    /**
     * @notice See {IPostInteraction-postInteraction}.
     * @dev Update pool balances and get fee takerAsset.
     * `extraData` consists of:
     * 20 bytes — protocol fee recipient, not required if protocol fee is 0
     * 20 bytes — provider fee recipient, optional
     */
    function postInteraction(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) external onlyLimitOrderProtocol {
        bytes32 lopapool = getPool(order);
        // Transfer assets and fee to maker
        (uint256 protocolFeeAmount, uint256 providerFeeAmount) = _transferAssetAndFee(lopapool, order, taker, makingAmount, takingAmount, extraData);

        // Update pool balances
        _postUpdateBalances(lopapool, protocolFeeAmount, providerFeeAmount, order, taker, makingAmount, takingAmount);

        // Update specific pool's state
        _postInteraction(order, extension, orderHash, taker, makingAmount, takingAmount, protocolFeeAmount, providerFeeAmount, remainingMakingAmount, extraData);
    }

    /**
     * @notice Calculates the amountOut of the makerAsset that the takerAsset will be converted to
     * @param lopapool The pool related to orders
     * @param balanceIn The balance of the assetIn in the pool (takerAsset in the order)
     * @param balanceOut The balance of the assetOut in the pool (makerAsset in the order)
     * @param order The order related to the pool which will be filled
     * @param extension The extension data of the order
     * @param orderHash The hash of the order
     * @param taker The address of the taker
     * @param amountIn The amount of takerAsset which taker will convert to makerAsset
     * @param remainingMakingAmount The param from 1inch LOP which could help to check how many makerAsset already was used before
     * @param extraData The extra calldata provided by maker
     * @return amountOut The amount of the asset that will be received
     */
    function _getMakingAmount(
        bytes32 lopapool,
        uint256 balanceIn,
        uint256 balanceOut,
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 amountIn,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) internal view virtual returns (uint256 amountOut);

    /**
     * @notice Calculates the amountIn of the takerAsset that will be converted to `amountOut` of makerAsset
     * @param lopapool The pool related to orders
     * @param balanceIn The balance of the assetIn in the pool (takerAsset in the order)
     * @param balanceOut The balance of the assetOut in the pool (makerAsset in the order)
     * @param order The order related to the pool which will be filled
     * @param extension The extension data of the order
     * @param orderHash The hash of the order
     * @param taker The address of the taker
     * @param amountOut The amount of makerAsset that the taker will receive
     * @param remainingMakingAmount The param from 1inch LOP which could help to check how many makerAsset already was used before
     * @param extraData The extra calldata provided by maker
     * @return amountIn The amount of takerAsset which taker should convert to makerAsset
     */
    function _getTakingAmount(
        bytes32 lopapool,
        uint256 balanceIn,
        uint256 balanceOut,
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 amountOut,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) internal view virtual returns (uint256 amountIn);

    /// @dev Method to add functionality about pool's state update in {IPostInteraction-postInteraction}
    function _postInteraction(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 protocolFeeAmount,
        uint256 providerFeeAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) internal virtual {} // solhint-disable-line no-empty-blocks

    /**
     * ==================== COMMON METHODS ====================
     */

    /// @notice Returns the contract implementation version.
    function version() external pure virtual returns (uint256) {
        return 1;
    }

    /// @notice Fallback function to receive ETH.
    receive() external payable {}

    /**
     * @notice Pauses or unpauses the protocol, affecting all orders.
     * @param value The desired pause status (true to pause, false to unpause).
     */
    function pause(bool value) external onlyOwner {
        paused = value;
        if (paused) {
            emit Paused();
        } else {
            emit Unpaused();
        }
    }

    /**
     * @notice Retrieves funds accidently sent directly to the contract address
     * @param token ERC20 token to retrieve
     * @param amount amount to retrieve, 0 for all token balance
     */
    function rescueFunds(IERC20 token, uint256 amount) external onlyOwner {
        if (amount == 0) {
            amount = token.uniBalanceOf(address(this));
        }
        token.uniTransfer(payable(msg.sender), amount);
    }
}
