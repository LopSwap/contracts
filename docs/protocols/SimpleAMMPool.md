
## SimpleAMMPool

Contract for typical AMM pools with the common formula `a * b = const`

### Functions list
- [constructor(limitOrderProtocol, owner) public](#constructor)
- [_getBalance(lopapool, asset) internal](#_getbalance)
- [_setBalance(lopapool, asset, amount) internal](#_setbalance)
- [_initializeBalances(lopapool, order, , , , , , , ) internal](#_initializebalances)
- [_transferAssetAndFee(, order, , , takingAmount, extraData) internal](#_transferassetandfee)
- [_preUpdateBalances(lopapool, order, , makingAmount, takingAmount) internal](#_preupdatebalances)
- [_postUpdateBalances(, , , , , , ) internal](#_postupdatebalances)
- [_getMakingAmount(, balanceIn, balanceOut, order, , , , amountIn, , ) internal](#_getmakingamount)
- [_getTakingAmount(, balanceIn, balanceOut, order, , , , amountOut, , ) internal](#_gettakingamount)
- [_getPoolBalances(lopapool, makerAsset, takerAsset) internal](#_getpoolbalances)

### Functions
### constructor

```solidity
constructor(address limitOrderProtocol, address owner) public
```

### _getBalance

```solidity
function _getBalance(bytes32 lopapool, address asset) internal view virtual returns (uint256)
```
See {LOPSwap-_getBalance}

### _setBalance

```solidity
function _setBalance(bytes32 lopapool, address asset, uint256 amount) internal virtual
```
See {LOPSwap-_setBalance}

### _initializeBalances

```solidity
function _initializeBalances(bytes32 lopapool, struct IOrderMixin.Order order, bytes, bytes32, address, uint256, uint256, uint256, bytes) internal virtual
```
See {LOPSwap-_initializeBalances}

### _transferAssetAndFee

```solidity
function _transferAssetAndFee(bytes32, struct IOrderMixin.Order order, address, uint256, uint256 takingAmount, bytes extraData) internal virtual returns (uint256 protocolFeeAmount, uint256 providerFeeAmount)
```
See {LOPSwap-_transferAssetAndFee}

### _preUpdateBalances

```solidity
function _preUpdateBalances(bytes32 lopapool, struct IOrderMixin.Order order, address, uint256 makingAmount, uint256 takingAmount) internal virtual
```
See {LOPSwap-_preUpdateBalances}

### _postUpdateBalances

```solidity
function _postUpdateBalances(bytes32, uint256, uint256, struct IOrderMixin.Order, address, uint256, uint256) internal virtual
```
See {LOPSwap-_postUpdateBalances}

### _getMakingAmount

```solidity
function _getMakingAmount(bytes32, uint256 balanceIn, uint256 balanceOut, struct IOrderMixin.Order order, bytes, bytes32, address, uint256 amountIn, uint256, bytes) internal view virtual returns (uint256)
```
See {LOPSwap-_getMakingAmount}

### _getTakingAmount

```solidity
function _getTakingAmount(bytes32, uint256 balanceIn, uint256 balanceOut, struct IOrderMixin.Order order, bytes, bytes32, address, uint256 amountOut, uint256, bytes) internal view virtual returns (uint256)
```
See {LOPSwap-_getTakingAmount}

### _getPoolBalances

```solidity
function _getPoolBalances(bytes32 lopapool, address makerAsset, address takerAsset) internal view virtual returns (uint256, uint256)
```
See {LOPSwap-_getPoolBalances}

