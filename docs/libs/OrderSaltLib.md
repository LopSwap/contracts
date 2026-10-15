
## OrderSaltLib

This library to get payload from salt field in order

_Orders's salt structure:
High bits are used as payload
0-159 bits    - Extension validation, keccak(extension).
160-231 bits  - Salt value.
232-247 bits  - Liquidity provider's fee. The value is in base 1e5.
248-255 bits  - Bitmap flags (axxxxxxx):
                 - `a` set if maker is provider fee receiver instead of data in `extraData`
                 - `x` reserved for future use_

### Functions list
- [bitmapFlags(salt) internal](#bitmapflags)
- [isProviderFeeReceiverMaker(salt) internal](#isproviderfeereceivermaker)
- [providerFee(salt) internal](#providerfee)

### Functions
### bitmapFlags

```solidity
function bitmapFlags(uint256 salt) internal pure returns (uint256)
```
The bitmap flags to determine the applicable logic and calculations

### isProviderFeeReceiverMaker

```solidity
function isProviderFeeReceiverMaker(uint256 salt) internal pure returns (bool)
```
Is the liquidity provider (maker) the fee receiver instead of data in `extraData`

### providerFee

```solidity
function providerFee(uint256 salt) internal pure returns (uint256)
```
The percentage fee based on ${BasePool-FEE_BASE} that the liquidity provider (maker) will receive in takerAsset

