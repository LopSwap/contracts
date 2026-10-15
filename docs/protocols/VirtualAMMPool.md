
## VirtualAMMPool

AMM based on Mooniswap's virtual-balance mechanism.

### Functions list
- [constructor(limitOrderProtocol, owner) public](#constructor)
- [getBalanceForAddition(lopapool, token) public](#getbalanceforaddition)
- [getBalanceForRemoval(lopapool, token) public](#getbalanceforremoval)
- [_getMakingAmount(lopapool, balanceIn, balanceOut, order, , , , amountIn, , ) internal](#_getmakingamount)
- [_getTakingAmount(lopapool, balanceIn, balanceOut, order, , , , amountOut, , ) internal](#_gettakingamount)
- [_preUpdateBalances(lopapool, order, , makingAmount, takingAmount) internal](#_preupdatebalances)
- [_getPoolBalances(lopapool, makerAsset, takerAsset) internal](#_getpoolbalances)

### Functions
### constructor

```solidity
constructor(address limitOrderProtocol, address owner) public
```

### getBalanceForAddition

```solidity
function getBalanceForAddition(bytes32 lopapool, address token) public view returns (uint256)
```

### getBalanceForRemoval

```solidity
function getBalanceForRemoval(bytes32 lopapool, address token) public view returns (uint256)
```

### _getMakingAmount

```solidity
function _getMakingAmount(bytes32 lopapool, uint256 balanceIn, uint256 balanceOut, struct IOrderMixin.Order order, bytes, bytes32, address, uint256 amountIn, uint256, bytes) internal view virtual returns (uint256)
```
See {BasePool-_getMakingAmount}

_Adaptation of Mooniswap `swap` method
https://github.com/1inch/mooniswap/blob/master/contracts/Mooniswap.sol#L214_

### _getTakingAmount

```solidity
function _getTakingAmount(bytes32 lopapool, uint256 balanceIn, uint256 balanceOut, struct IOrderMixin.Order order, bytes, bytes32, address, uint256 amountOut, uint256, bytes) internal view virtual returns (uint256)
```
See {BasePool-_getTakingAmount}

_Adaptation of Mooniswap `swap` method
https://github.com/1inch/mooniswap/blob/master/contracts/Mooniswap.sol#L214_

### _preUpdateBalances

```solidity
function _preUpdateBalances(bytes32 lopapool, struct IOrderMixin.Order order, address, uint256 makingAmount, uint256 takingAmount) internal virtual
```
See {LOPSwap-_preUpdateBalances}

### _getPoolBalances

```solidity
function _getPoolBalances(bytes32 lopapool, address makerAsset, address takerAsset) internal view virtual returns (uint256, uint256)
```
See {LOPSwap-_getPoolBalances}

