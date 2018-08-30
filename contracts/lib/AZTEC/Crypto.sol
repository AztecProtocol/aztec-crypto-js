// pragma solidity ^0.4.23;

// /// @title Library to perform basic bn128 cryptographic operations
// /// @author CreditMint

// library Crypto {
//     uint constant FIELD_MODULUS = 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47;
//     uint constant G_X = 1;
//     uint constant G_Y = 2;
//     struct Point {
//         uint x;
//         uint y;
//     }

//     /// @dev adds two points and places result in r
//     function _add(Point memory p1, Point memory p2, Point memory r) internal view {
//         assembly {
//             let m := mload(0x40)
//             mstore(m, mload(p1))
//             mstore(add(m, 0x20), mload(add(p1, 0x20)))
//             mstore(add(m, 0x40), mload(p2))
//             mstore(add(m, 0x60), mload(add(p2, 0x20)))
//             if iszero(staticcall(not(0), 6, 0x00, 0x60, r, 0x40)) {
//                 revert(0x00, 0x00)
//             }
//         }
//     }

//     /// @dev adds two points in place, result is placed in p1 (mutates)
//     function _addInPlace(Point memory p1, Point memory p2) internal view {
//         assembly {
//             let m := mload(0x40)
//             mstore(m, mload(p1))
//             mstore(add(m, 0x20), mload(add(p1, 0x20)))
//             mstore(add(m, 0x40), mload(p2))
//             mstore(add(m, 0x60), mload(add(p2, 0x20)))
//             if iszero(staticcall(not(0), 6, 0x00, 0x60, p1, 0x40)) {
//                 revert(0x00, 0x00)
//             }
//         }
//     }

//     /// @dev subtracts p2 from p1, result is placed in p1 (mutates)
//     function _subInPlace(Point memory p1, Point memory p2) internal view {
//         uint field_modulus = FIELD_MODULUS;
//         assembly {
//             let m := mload(0x40)
//             mstore(m, mload(p1))
//             mstore(add(m, 0x20), mload(add(p1, 0x20)))
//             mstore(add(m, 0x40), mload(p2))
//             mstore(add(m, 0x60), sub(field_modulus, mload(add(p2, 0x20))))
//             if iszero(staticcall(not(0), 6, 0x00, 0x60, p1, 0x40)) {
//                 revert(0x00, 0x00)
//             }
//         }
//     }

//     /// @dev multiplies p1 by scalar, mutates p1
//     function _mulInPlace(Point memory p1, uint scalar) internal view {
//         assembly {
//             let m := mload(0x40)
//             mstore(m, mload(p1))
//             mstore(add(m, 0x20), mload(add(p1, 0x20)))
//             mstore(add(m, 0x40), scalar)
//             if iszero(staticcall(not(0), 6, 0x00, 0x60, p1, 0x40)) {
//                 revert(0x00, 0x00)
//             }
//         }
//     }

//     /// @dev multiplies p1 by scalar, result placed in r
//     function _mul(Point memory p1, uint scalar, Point memory r) internal view {
//         assembly {
//             let m := mload(0x40)
//             mstore(m, mload(p1))
//             mstore(add(m, 0x20), mload(add(p1, 0x20)))
//             mstore(add(m, 0x40), scalar)
//             if iszero(staticcall(not(0), 6, 0x00, 0x60, r, 0x40)) {
//                 revert(0x00, 0x00)
//             }
//         }
//     }

//     /// @dev multiplies generator point by scalar, result placed in r
//     function _mulG(uint scalar, Point memory r) internal view {
//         uint g_x = G_X;
//         uint g_y = G_Y;
//         assembly {
//             let m := mload(0x40)
//             mstore(m, g_x)
//             mstore(add(m, 0x20), g_y)
//             mstore(add(m, 0x40), scalar)
//             if iszero(staticcall(not(0), 6, 0x00, 0x60, r, 0x40)) {
//                 revert(0x00, 0x00)
//             }
//         }
//     }

//     /// @dev inverts point in y-axis, mutates point
//     function neg(Point memory point) internal view {
//         uint field_modulus = FIELD_MODULUS;
//         assembly {
//             mstore(add(point, 0x20), sub(field_modulus, mload(add(point, 0x20))))
//         }
//     }
// }