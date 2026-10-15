// SPDX-License-Identifier: LicenseRef-LOPSwap-Source-1.0
// License: https://github.com/LopSwap/contracts/blob/master/LICENSE.md

pragma solidity ^0.8.0;

/**
 * @title OrderSaltLib
 * @notice This library to get payload from salt field in order
 * @dev Orders's salt structure:
 * High bits are used as payload
 * 0-159 bits    - Extension validation, keccak(extension).
 * 160-231 bits  - Salt value.
 * 232-247 bits  - Liquidity provider's fee. The value is in base 1e5.
 * 248-255 bits  - Bitmap flags (axxxxxxx):
 *                  - `a` set if maker is provider fee receiver instead of data in `extraData`
 *                  - `x` reserved for future use
 */
library OrderSaltLib {
    uint256 private constant _FLAGS_OFFSET = 248;
    uint256 private constant _FLAGS_MASK = 0xff;
    uint256 private constant _PROVIDER_FEE_OFFSET = 232;
    uint256 private constant _PROVIDER_FEE_MASK = 0xffff;

    /**
     * @notice The bitmap flags to determine the applicable logic and calculations
     */
    function bitmapFlags(uint256 salt) internal pure returns (uint256) {
        return (salt >> _FLAGS_OFFSET) & _FLAGS_MASK;
    }

    /**
     * @notice Is the liquidity provider (maker) the fee receiver instead of data in `extraData`
     */
    function isProviderFeeReceiverMaker(uint256 salt) internal pure returns (bool) {
        return (bitmapFlags(salt) & 0x80) != 0;
    }

    /**
     * @notice The percentage fee based on ${BasePool-FEE_BASE} that the liquidity provider (maker) will receive in takerAsset
     */
    function providerFee(uint256 salt) internal pure returns (uint256) {
        return (salt >> _PROVIDER_FEE_OFFSET) & _PROVIDER_FEE_MASK;
    }
}
