// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BabyJub
 * @notice Minimal Baby JubJub twisted-Edwards curve operations over the BN254 scalar field.
 *
 * Curve parameters (https://eips.ethereum.org/EIPS/eip-2494):
 *   Field:  p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
 *   a     = 168700
 *   d     = 168696
 *   Identity element: (0, 1)
 *
 * Point addition on a twisted Edwards curve ax²+y²=1+dx²y²:
 *   x₃ = (x₁y₂ + x₂y₁) / (1 + d·x₁x₂y₁y₂)
 *   y₃ = (y₁y₂ − a·x₁x₂) / (1 − d·x₁x₂y₁y₂)
 *
 * Division is multiplication by the modular inverse (Fermat's little theorem).
 */
library BabyJub {
    // BN254 (alt_bn128) scalar field order — also the BabyJub base field
    uint256 internal constant P =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    uint256 internal constant A = 168700;
    uint256 internal constant D = 168696;

    struct Point {
        uint256 x;
        uint256 y;
    }

    /// @notice Returns the additive identity (0, 1).
    function identity() internal pure returns (Point memory) {
        return Point(0, 1);
    }

    /// @notice Returns true iff p is the identity element.
    function isIdentity(Point memory p) internal pure returns (bool) {
        return p.x == 0 && p.y == 1;
    }

    /**
     * @notice Add two BabyJub points.
     * @dev Uses the unified twisted-Edwards addition formula; no special-case needed.
     */
    function add(Point memory p1, Point memory p2) internal view returns (Point memory) {
        // Intermediate products
        uint256 x1y2 = mulmod(p1.x, p2.y, P);
        uint256 x2y1 = mulmod(p2.x, p1.y, P);
        uint256 y1y2 = mulmod(p1.y, p2.y, P);
        uint256 x1x2 = mulmod(p1.x, p2.x, P);

        // k = d * x1 * x2 * y1 * y2 mod p
        uint256 k = mulmod(D, mulmod(x1x2, y1y2, P), P);

        // Numerators
        uint256 numX = addmod(x1y2, x2y1, P);
        // a * x1 * x2
        uint256 ax1x2 = mulmod(A, x1x2, P);
        // y1*y2 - a*x1*x2  (mod p, handle underflow)
        uint256 numY = addmod(y1y2, P - ax1x2, P);

        // Denominators
        uint256 denX = addmod(1, k, P); // 1 + k
        uint256 denY = addmod(1, P - k, P); // 1 - k  (mod p)

        // Divide via modular inverse (Fermat: a^(p-2) mod p)
        uint256 x3 = mulmod(numX, _inv(denX), P);
        uint256 y3 = mulmod(numY, _inv(denY), P);

        return Point(x3, y3);
    }

    /// @notice Modular inverse via the modexp precompile (EIP-198).
    function _inv(uint256 a) private view returns (uint256 result) {
        require(a != 0, "BabyJub: zero inverse");
        // Call precompile 0x05: modexp(base, exp, mod)
        // Returns a^(P-2) mod P
        bool ok;
        (ok, result) = _modexp(a, P - 2, P);
        require(ok, "BabyJub: modexp failed");
    }

    /// @dev Low-level modexp precompile call.
    function _modexp(uint256 base, uint256 exp, uint256 mod)
        private
        view
        returns (bool success, uint256 result)
    {
        bytes memory input = abi.encode(
            uint256(32), // base length
            uint256(32), // exp length
            uint256(32), // mod length
            base,
            exp,
            mod
        );
        bytes memory output = new bytes(32);
        assembly {
            success := staticcall(gas(), 0x05, add(input, 32), mload(input), add(output, 32), 32)
        }
        result = abi.decode(output, (uint256));
    }
}
