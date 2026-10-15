
## FlashLoanPool

Contract for flash loan pools

_This contract uses Erc20True token as a takerAsset to avoid extra operations,
     so the pool doesn't use takerAsset and related balance_

### Functions list
- [constructor(limitOrderProtocol, owner) public](#constructor)
- [getPool(order) public](#getpool)
- [_getBalance(lopapool, ) internal](#_getbalance)
- [_setBalance(lopapool, , amount) internal](#_setbalance)
- [_initializeBalances(lopapool, order, , , , , , , ) internal](#_initializebalances)
- [_transferAssetAndFee(, order, taker, , takingAmount, extraData) internal](#_transferassetandfee)
- [_preUpdateBalances(lopapool, order, , makingAmount, ) internal](#_preupdatebalances)
- [_postUpdateBalances(lopapool, , , order, , makingAmount, takingAmount) internal](#_postupdatebalances)
- [_getMakingAmount(, , balanceOut, order, , , , amountIn, , ) internal](#_getmakingamount)
- [_getTakingAmount(, , balanceOut, order, , , , amountOut, , ) internal](#_gettakingamount)
- [_getPoolBalances(lopapool, , ) internal](#_getpoolbalances)

### Errors list
- [InsufficientRepayment() ](#insufficientrepayment)

### Functions
### constructor

```solidity
constructor(address limitOrderProtocol, address owner) public
```

### getPool

```solidity
function getPool(struct IOrderMixin.Order order) public pure virtual returns (bytes32)
```
See {LOPSwap-getPool}

### _getBalance

```solidity
function _getBalance(bytes32 lopapool, address) internal view virtual returns (uint256)
```
See {LOPSwap-_getBalance}

### _setBalance

```solidity
function _setBalance(bytes32 lopapool, address, uint256 amount) internal virtual
```
See {LOPSwap-setBalance}

### _initializeBalances

```solidity
function _initializeBalances(bytes32 lopapool, struct IOrderMixin.Order order, bytes, bytes32, address, uint256, uint256, uint256, bytes) internal virtual
```
See {LOPSwap-_initializeBalances}

### _transferAssetAndFee

```solidity
function _transferAssetAndFee(bytes32, struct IOrderMixin.Order order, address taker, uint256, uint256 takingAmount, bytes extraData) internal virtual returns (uint256 protocolFeeAmount, uint256 providerFeeAmount)
```
See {LOPSwap-_transferAssetAndFee}

### _preUpdateBalances

```solidity
function _preUpdateBalances(bytes32 lopapool, struct IOrderMixin.Order order, address, uint256 makingAmount, uint256) internal virtual
```
See {LOPSwap-_preUpdateBalances}

### _postUpdateBalances

```solidity
function _postUpdateBalances(bytes32 lopapool, uint256, uint256, struct IOrderMixin.Order order, address, uint256 makingAmount, uint256 takingAmount) internal virtual
```
See {LOPSwap-_postUpdateBalances}

### _getMakingAmount

```solidity
function _getMakingAmount(bytes32, uint256, uint256 balanceOut, struct IOrderMixin.Order order, bytes, bytes32, address, uint256 amountIn, uint256, bytes) internal view virtual returns (uint256)
```
See {LOPSwap-_getMakingAmount}

### _getTakingAmount

```solidity
function _getTakingAmount(bytes32, uint256, uint256 balanceOut, struct IOrderMixin.Order order, bytes, bytes32, address, uint256 amountOut, uint256, bytes) internal view virtual returns (uint256)
```
See {LOPSwap-_getTakingAmount}

### _getPoolBalances

```solidity
function _getPoolBalances(bytes32 lopapool, address, address) internal view virtual returns (uint256, uint256)
```
See {LOPSwap-_getPoolBalances}

### Errors
### InsufficientRepayment

```solidity
error InsufficientRepayment()
```

