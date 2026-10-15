
## LOPSwap

Protocol with offchain liquidity pools used 1inch Limit Order Protocol.

_Contract for different protocols pool calculations with common implementation.
WARNING: Maker-controlled pools; rates may change via setLiquidity/invalidatePool.
Takers MUST set slippage protection, otherwise the tx may fail or execute at a worse rate._

### Types list
- [PoolStatus](#poolstatus)

### Functions list
- [constructor(limitOrderProtocol, owner) internal](#constructor)
- [_getBalance(lopapool, asset) internal](#_getbalance)
- [_setBalance(lopapool, asset, amount) internal](#_setbalance)
- [setProtocolFee(fee, recipient) external](#setprotocolfee)
- [getPool(order) public](#getpool)
- [getBalances(order) public](#getbalances)
- [getReturnMakingAmount(order, amountIn) external](#getreturnmakingamount)
- [getReturnTakingAmount(order, amountOut) external](#getreturntakingamount)
- [_getBalances(order, lopapool) internal](#_getbalances)
- [_getPoolBalances(lopapool, makerAsset, takerAsset) internal](#_getpoolbalances)
- [_getLopapoolWithBalances(order) internal](#_getlopapoolwithbalances)
- [invalidatePool(order) external](#invalidatepool)
- [setLiquidity(order, assets, amounts) external](#setliquidity)
- [_initializeBalances(lopapool, order, extension, orderHash, taker, makingAmount, takingAmount, remainingMakingAmount, extraData) internal](#_initializebalances)
- [_transferProtocolFee(asset, assetAmount) internal](#_transferprotocolfee)
- [_transferAssetAndFee(lopapool, order, taker, makingAmount, takingAmount, extraData) internal](#_transferassetandfee)
- [_preUpdateBalances(lopapool, order, taker, makingAmount, takingAmount) internal](#_preupdatebalances)
- [_postUpdateBalances(lopapool, protocolFeeAmount, providerFeeAmount, order, taker, makingAmount, takingAmount) internal](#_postupdatebalances)
- [getMakingAmount(order, extension, orderHash, taker, takingAmount, remainingMakingAmount, extraData) external](#getmakingamount)
- [getTakingAmount(order, extension, orderHash, taker, makingAmount, remainingMakingAmount, extraData) external](#gettakingamount)
- [preInteraction(order, extension, orderHash, taker, makingAmount, takingAmount, remainingMakingAmount, extraData) external](#preinteraction)
- [postInteraction(order, extension, orderHash, taker, makingAmount, takingAmount, remainingMakingAmount, extraData) external](#postinteraction)
- [_getMakingAmount(lopapool, balanceIn, balanceOut, order, extension, orderHash, taker, amountIn, remainingMakingAmount, extraData) internal](#_getmakingamount)
- [_getTakingAmount(lopapool, balanceIn, balanceOut, order, extension, orderHash, taker, amountOut, remainingMakingAmount, extraData) internal](#_gettakingamount)
- [_postInteraction(order, extension, orderHash, taker, makingAmount, takingAmount, protocolFeeAmount, providerFeeAmount, remainingMakingAmount, extraData) internal](#_postinteraction)
- [receive() external](#receive)
- [pause(value) external](#pause)
- [rescueFunds(token, amount) external](#rescuefunds)

### Events list
- [Paused() ](#paused)
- [Unpaused() ](#unpaused)

### Errors list
- [OnlyLimitOrderProtocol() ](#onlylimitorderprotocol)
- [InvalidatedPool() ](#invalidatedpool)
- [NotEnoughLiquidity() ](#notenoughliquidity)
- [AccessDenied() ](#accessdenied)
- [InvalidParams() ](#invalidparams)
- [NotInitializedPool() ](#notinitializedpool)
- [FeesTooHigh() ](#feestoohigh)

### Types
### PoolStatus

```solidity
enum PoolStatus {
  NEW,
  INITIALIZED,
  INVALIDATED
}
```

### Functions
### constructor

```solidity
constructor(address limitOrderProtocol, address owner) internal
```
Initializes the contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| limitOrderProtocol | address | The 1inch limit order protocol contract. |
| owner | address |  |

### _getBalance

```solidity
function _getBalance(bytes32 lopapool, address asset) internal view virtual returns (uint256)
```

_Returns the balance of the specified asset in the specified pool_

### _setBalance

```solidity
function _setBalance(bytes32 lopapool, address asset, uint256 amount) internal virtual
```

_Sets the balance of the specified asset in the specified pool_

### setProtocolFee

```solidity
function setProtocolFee(uint256 fee, address recipient) external
```
Sets the protocol fee.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fee | uint256 | The new protocol fee. The value is in base 1e5. |
| recipient | address | The address of the protocol fee recipient. |

### getPool

```solidity
function getPool(struct IOrderMixin.Order order) public pure virtual returns (bytes32)
```
Calculates the pool ID (lopapool) from the order

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| order | struct IOrderMixin.Order | The order related to lopapool |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
[0] | bytes32 | pool The lopapool |

### getBalances

```solidity
function getBalances(struct IOrderMixin.Order order) public view returns (uint256 makerAssetBalance, uint256 takerAssetBalance, uint256 availableMakerAssetBalance, uint256 availableTakerAssetBalance)
```
Shows pool's balances and available balances by order.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| order | struct IOrderMixin.Order | The order related to lopapool. |

### getReturnMakingAmount

```solidity
function getReturnMakingAmount(struct IOrderMixin.Order order, uint256 amountIn) external view returns (uint256)
```
The amount of `amountIn` should be converted to

_This is correct only for AMM's that use only assets and amounts_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| order | struct IOrderMixin.Order | The order related to the pool which will be filled |
| amountIn | uint256 | The amount of takerAsset which taker will convert to makerAsset |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
[0] | uint256 | {amountOut} The amount of the asset that will be received |

### getReturnTakingAmount

```solidity
function getReturnTakingAmount(struct IOrderMixin.Order order, uint256 amountOut) external view returns (uint256)
```
The amount of takerAsset which taker should convert to makerAsset

_This is correct only for AMM's that use only assets and amounts_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| order | struct IOrderMixin.Order | The order related to the pool which will be filled |
| amountOut | uint256 | The amount of makerAsset that the taker will receive |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
[0] | uint256 | {amountIn} The amount of takerAsset which taker should convert to makerAsset |

### _getBalances

```solidity
function _getBalances(struct IOrderMixin.Order order, bytes32 lopapool) internal view returns (uint256 makerAssetBalance, uint256 takerAssetBalance)
```

_Check pool's balances of makerAsset and takerAsset before init pool_

### _getPoolBalances

```solidity
function _getPoolBalances(bytes32 lopapool, address makerAsset, address takerAsset) internal view virtual returns (uint256 makerAssetBalance, uint256 takerAssetBalance)
```

_Return actual balances of makerAsset and takerAsset in the pool in the current state_

### _getLopapoolWithBalances

```solidity
function _getLopapoolWithBalances(struct IOrderMixin.Order order) internal view returns (bytes32 lopapool, uint256 makerAssetBalance, uint256 takerAssetBalance)
```

_The common method for `getMakingAmount` and `getTakingAmount` to get data and check it_

### invalidatePool

```solidity
function invalidatePool(struct IOrderMixin.Order order) external
```
Invalidate pool by order. Only `maker` and `owner` can call this method.

_Allows invalidating both reciprocal orders in a single transaction instead of two separate invalidations in the 1inch LOP protocol._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| order | struct IOrderMixin.Order | The order from the lopapool |

### setLiquidity

```solidity
function setLiquidity(struct IOrderMixin.Order order, address[] assets, uint256[] amounts) external
```
Sets the liquidity for the pool by pool's creator.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| order | struct IOrderMixin.Order | The order related to the pool |
| assets | address[] | The list of assets to set balances for |
| amounts | uint256[] | The list of amounts to set balances for |

### _initializeBalances

```solidity
function _initializeBalances(bytes32 lopapool, struct IOrderMixin.Order order, bytes extension, bytes32 orderHash, address taker, uint256 makingAmount, uint256 takingAmount, uint256 remainingMakingAmount, bytes extraData) internal virtual
```

_Initializes balances during first interaction with the lopapool_

### _transferProtocolFee

```solidity
function _transferProtocolFee(address asset, uint256 assetAmount) internal virtual returns (uint256 protocolFeeAmount)
```

_Transfer special token as protocol fee_

### _transferAssetAndFee

```solidity
function _transferAssetAndFee(bytes32 lopapool, struct IOrderMixin.Order order, address taker, uint256 makingAmount, uint256 takingAmount, bytes extraData) internal virtual returns (uint256 protocolFeeAmount, uint256 providerFeeAmount)
```

_Transfers assets and fees from taker to maker_

### _preUpdateBalances

```solidity
function _preUpdateBalances(bytes32 lopapool, struct IOrderMixin.Order order, address taker, uint256 makingAmount, uint256 takingAmount) internal virtual
```

_Updates balances after interaction with the pool_

### _postUpdateBalances

```solidity
function _postUpdateBalances(bytes32 lopapool, uint256 protocolFeeAmount, uint256 providerFeeAmount, struct IOrderMixin.Order order, address taker, uint256 makingAmount, uint256 takingAmount) internal virtual
```

_Updates balances after interaction with the pool_

### getMakingAmount

```solidity
function getMakingAmount(struct IOrderMixin.Order order, bytes extension, bytes32 orderHash, address taker, uint256 takingAmount, uint256 remainingMakingAmount, bytes extraData) external view returns (uint256 calculatedMakingAmount)
```
See {IAmountGetter-getMakingAmount}.

### getTakingAmount

```solidity
function getTakingAmount(struct IOrderMixin.Order order, bytes extension, bytes32 orderHash, address taker, uint256 makingAmount, uint256 remainingMakingAmount, bytes extraData) external view returns (uint256 calculatedTakingAmount)
```
See {IAmountGetter-getTakingAmount}.

### preInteraction

```solidity
function preInteraction(struct IOrderMixin.Order order, bytes extension, bytes32 orderHash, address taker, uint256 makingAmount, uint256 takingAmount, uint256 remainingMakingAmount, bytes extraData) external
```
See {IPreInteraction-postInteraction}.

### postInteraction

```solidity
function postInteraction(struct IOrderMixin.Order order, bytes extension, bytes32 orderHash, address taker, uint256 makingAmount, uint256 takingAmount, uint256 remainingMakingAmount, bytes extraData) external
```
See {IPostInteraction-postInteraction}.

_Update pool balances and get fee takerAsset.
`extraData` consists of:
20 bytes — protocol fee recipient, not required if protocol fee is 0
20 bytes — provider fee recipient, optional_

### _getMakingAmount

```solidity
function _getMakingAmount(bytes32 lopapool, uint256 balanceIn, uint256 balanceOut, struct IOrderMixin.Order order, bytes extension, bytes32 orderHash, address taker, uint256 amountIn, uint256 remainingMakingAmount, bytes extraData) internal view virtual returns (uint256 amountOut)
```
Calculates the amountOut of the makerAsset that the takerAsset will be converted to

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| lopapool | bytes32 | The pool related to orders |
| balanceIn | uint256 | The balance of the assetIn in the pool (takerAsset in the order) |
| balanceOut | uint256 | The balance of the assetOut in the pool (makerAsset in the order) |
| order | struct IOrderMixin.Order | The order related to the pool which will be filled |
| extension | bytes | The extension data of the order |
| orderHash | bytes32 | The hash of the order |
| taker | address | The address of the taker |
| amountIn | uint256 | The amount of takerAsset which taker will convert to makerAsset |
| remainingMakingAmount | uint256 | The param from 1inch LOP which could help to check how many makerAsset already was used before |
| extraData | bytes | The extra calldata provided by maker |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
amountOut | uint256 | The amount of the asset that will be received |

### _getTakingAmount

```solidity
function _getTakingAmount(bytes32 lopapool, uint256 balanceIn, uint256 balanceOut, struct IOrderMixin.Order order, bytes extension, bytes32 orderHash, address taker, uint256 amountOut, uint256 remainingMakingAmount, bytes extraData) internal view virtual returns (uint256 amountIn)
```
Calculates the amountIn of the takerAsset that will be converted to `amountOut` of makerAsset

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| lopapool | bytes32 | The pool related to orders |
| balanceIn | uint256 | The balance of the assetIn in the pool (takerAsset in the order) |
| balanceOut | uint256 | The balance of the assetOut in the pool (makerAsset in the order) |
| order | struct IOrderMixin.Order | The order related to the pool which will be filled |
| extension | bytes | The extension data of the order |
| orderHash | bytes32 | The hash of the order |
| taker | address | The address of the taker |
| amountOut | uint256 | The amount of makerAsset that the taker will receive |
| remainingMakingAmount | uint256 | The param from 1inch LOP which could help to check how many makerAsset already was used before |
| extraData | bytes | The extra calldata provided by maker |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
amountIn | uint256 | The amount of takerAsset which taker should convert to makerAsset |

### _postInteraction

```solidity
function _postInteraction(struct IOrderMixin.Order order, bytes extension, bytes32 orderHash, address taker, uint256 makingAmount, uint256 takingAmount, uint256 protocolFeeAmount, uint256 providerFeeAmount, uint256 remainingMakingAmount, bytes extraData) internal virtual
```

_Method to add functionality about pool's state update in {IPostInteraction-postInteraction}_

### receive

```solidity
receive() external payable
```
Fallback function to receive ETH.

### pause

```solidity
function pause(bool value) external
```
Pauses or unpauses the protocol, affecting all orders.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | bool | The desired pause status (true to pause, false to unpause). |

### rescueFunds

```solidity
function rescueFunds(contract IERC20 token, uint256 amount) external
```
Retrieves funds accidently sent directly to the contract address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | contract IERC20 | ERC20 token to retrieve |
| amount | uint256 | amount to retrieve, 0 for all token balance |

### Events
### Paused

```solidity
event Paused()
```

_Emitted when the pause is triggered._

### Unpaused

```solidity
event Unpaused()
```

_Emitted when the pause is lifted._

### Errors
### OnlyLimitOrderProtocol

```solidity
error OnlyLimitOrderProtocol()
```

### InvalidatedPool

```solidity
error InvalidatedPool()
```

### NotEnoughLiquidity

```solidity
error NotEnoughLiquidity()
```

### AccessDenied

```solidity
error AccessDenied()
```

### InvalidParams

```solidity
error InvalidParams()
```

### NotInitializedPool

```solidity
error NotInitializedPool()
```

### FeesTooHigh

```solidity
error FeesTooHigh()
```

