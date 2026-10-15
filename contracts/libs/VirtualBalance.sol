// SPDX-License-Identifier: LicenseRef-LOPSwap-Source-1.0
// License: https://github.com/LopSwap/contracts/blob/master/LICENSE.md

/*
 * Portions of this source code are derived from:
 * https://github.com/1inch/mooniswap/blob/master/contracts/Mooniswap.sol#L19-L49
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

pragma solidity ^0.8.0;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

library VirtualBalance {
    struct Data {
        uint216 balance;
        uint40 time;
    }

    uint256 public constant DECAY_PERIOD = 5 minutes;

    function set(VirtualBalance.Data storage self, uint256 balance) internal {
        self.balance = uint216(balance);
        self.time = uint40(block.timestamp);
    }

    function update(VirtualBalance.Data storage self, uint256 realBalance) internal {
        set(self, current(self, realBalance));
    }

    function current(VirtualBalance.Data memory self, uint256 realBalance) internal view returns(uint256) {
        uint256 timePassed = Math.min(DECAY_PERIOD, block.timestamp - self.time);
        uint256 timeRemain = DECAY_PERIOD - timePassed;
        return (uint256(self.balance) * timeRemain + realBalance * timePassed) / DECAY_PERIOD;
    }
}
