pragma solidity ^0.4.20;

import "./NIZK.sol";

contract NizkEth {

    bytes32[4] public setupPubKey;
    mapping(bytes32 => uint) public noteRegistry;
    bool initialized;
    uint constant ETH_RATIO = 10000000000000000; // 10^16 wei is smallest note denomination (0.01 eth)
    uint constant NOTE_MAX = 10000; // 9,999.99 eth is largest possible note

    constructor(bytes32[4] _setupPubKey) public {
        setupPubKey = _setupPubKey;
        initialized = true;
    }

    event SplitTransaction(bytes32[3] inputNote, bytes32[3] outputNoteA, bytes32[3] outputNoteB);
    event JoinTransaction(bytes32[3] inputNoteA, bytes32[3] inputNoteB, bytes32[3] outputNote);
    event RedeemTransaction(bytes32[3] note, uint value);
    event CommitTransaction(bytes32[3] note, uint value);

    function redeemNote(bytes32[6], uint k, bytes32[2]) external returns (bool) {
        require(initialized);
        require(k < NOTE_MAX);

        uint v = k * ETH_RATIO;
        uint[6] memory inputNote;
        bytes32 noteHash;
        assembly {
            let m := inputNote
            mstore(0x40, add(m, 0xe0))
            mstore(m, 0x814fba6600000000000000000000000000000000000000000000000000000000)
            mstore(add(m, 0x04), caller)
            calldatacopy(add(m, 0x24), 0x04, 0x120)
            let success := staticcall(not(0), NizkInterfaceLibrary, m, 0x144, m, 0xe0)
            if or(iszero(success), iszero(eq(mload(m), 0x01))) {
                mstore(0x00, 400)
                revert(0x00, 0x20)
            }
            inputNote := add(m, 0x20)
            noteHash := keccak256(inputNote, 0xc0)
        }
        require((noteRegistry[noteHash] == 1));
        noteRegistry[noteHash] = 0;

        emit RedeemTransaction(compressNote(inputNote), v);
        if (v != 0) {
            msg.sender.transfer(v);
        }
        return true;
    }

    function commitNote(bytes32[4]) external payable returns (bool) {
        uint k = msg.value / ETH_RATIO;
        require(msg.value == (k * ETH_RATIO)); // round numbers only
        require(k < NOTE_MAX);
        require(initialized);

        uint[6] memory outputNote;
        bytes32 noteHash;
        assembly {
            let m := outputNote
            mstore(0x40, add(m, 0xe0))
            mstore(m, 0x91036ec800000000000000000000000000000000000000000000000000000000)
            mstore(add(m, 0x04), caller)
            calldatacopy(add(m, 0x24), 0x04, 0x40)
            mstore(add(m, 0x64), k)
            calldatacopy(add(m, 0x84), 0x44, 0x40)
            let success := staticcall(not(0), NizkInterfaceLibrary, m, 0xc4, m, 0xe0)
            if or(iszero(success), iszero(eq(mload(m), 0x01))) {
                mstore(0x00, 400)
                revert(0x00, 0x20)
            }
            outputNote := add(m, 0x20)
            noteHash := keccak256(outputNote, 0xc0)
        }
        require(noteRegistry[noteHash] == 0);
        noteRegistry[noteHash] = 1;
        emit CommitTransaction(compressNote(outputNote), msg.value);
        return true;
    }

    function joinNotes(bytes32[22]) external returns(bool) {
        require(initialized);
        uint[6] memory c1;
        uint[6] memory c2;
        uint[6] memory c3;
        bytes32 c1Hash;
        bytes32 c2Hash;
        bytes32 c3Hash;
        assembly {
            let m := c1
            mstore(0x40, add(m, 0x260))
            mstore(m, 0xacc8cecd00000000000000000000000000000000000000000000000000000000)
            mstore(add(m, 0x04), caller)
            calldatacopy(add(m, 0x24), 0x04, 0x2c0)
            let success := staticcall(not(0), NizkInterfaceLibrary, m, 0x2e4, m, 0x260)
            if or(iszero(success), iszero(eq(mload(m), 0x01))) {
                mstore(0x00, 400)
                revert(0x00, 0x20)
            }
            c1 := add(m, 0x20)
            c2 := add(m, 0xe0)
            c3 := add(m, 0x1a0)
            c1Hash := keccak256(c1, 0xc0)
            c2Hash := keccak256(c2, 0xc0)
            c3Hash := keccak256(c3, 0xc0)
        }
        require(noteRegistry[c1Hash] == 1);
        require(noteRegistry[c2Hash] == 1);
        require(noteRegistry[c3Hash] == 0);
        noteRegistry[c1Hash] = 0;
        noteRegistry[c2Hash] = 0;
        noteRegistry[c3Hash] = 1;
        emit JoinTransaction(compressNote(c1), compressNote(c2), compressNote(c3));
        return true;
    }

    function splitNote(bytes32[34]) external returns (bool) {
        require(initialized);
        uint[6] memory c1;
        uint[6] memory c2;
        uint[6] memory c3;
        bytes32 c1Hash;
        bytes32 c2Hash;
        bytes32 c3Hash;
        assembly {
            let m := c1
            mstore(0x40, add(m, 0x260))
            mstore(m, 0x75d3464100000000000000000000000000000000000000000000000000000000)
            mstore(add(m, 0x04), caller)
            calldatacopy(add(m, 0x24), 0x04, 0x440)
            mstore(add(m, 0x464), sload(setupPubKey_slot))
            mstore(add(m, 0x484), sload(add(setupPubKey_slot, 1)))
            mstore(add(m, 0x4a4), sload(add(setupPubKey_slot, 2)))
            mstore(add(m, 0x4c4), sload(add(setupPubKey_slot, 3)))
            let success := staticcall(not(0), NizkInterfaceLibrary, m, 0x4e4, m, 0x260)
            if or(iszero(success), iszero(eq(mload(m), 0x01))) {
                mstore(0x00, 400)
                revert(0x00, 0x20)
            }
            c1 := add(m, 0x20)
            c2 := add(m, 0xe0)
            c3 := add(m, 0x1a0)
            c1Hash := keccak256(c1, 0xc0)
            c2Hash := keccak256(c2, 0xc0)
            c3Hash := keccak256(c3, 0xc0)
        }
        require(noteRegistry[c1Hash] == 1);
        require(noteRegistry[c2Hash] == 0);
        require(noteRegistry[c3Hash] == 0);
        noteRegistry[c1Hash] = 0;
        noteRegistry[c2Hash] = 1;
        noteRegistry[c3Hash] = 1;
        emit SplitTransaction(compressNote(c1), compressNote(c2), compressNote(c3));
        return true;
    }

    function compressNote(uint[6] m) internal pure returns (bytes32[3] r) {
        // broadcast y-coordinate as it's quadratic-residue 1-bit representation
        // field modulus is 254 bit number; can store y-bit as 256'th bit
        // NB: we use un-compressed coordinates as inputs because calculating a 254-bit modular exponentiation
        // is more expensive than the ~2000 gas cost of adding 32 bytes of data to transaction payload
        uint bitShift = 0x8000000000000000000000000000000000000000000000000000000000000000; //2^256
        r[0] = bytes32(m[0] + (bitShift * (m[1] & 0x0000000000000000000000000000000000000000000000000000000000000001)));
        r[1] = bytes32(m[2] + (bitShift * (m[3] & 0x0000000000000000000000000000000000000000000000000000000000000001)));
        r[2] = bytes32(m[4] + (bitShift * (m[5] & 0x0000000000000000000000000000000000000000000000000000000000000001)));
    }

    function compressNoteAsm(uint[6] m) internal pure returns (bytes32[3] r) {
        assembly {
            let bitShift := 0x8000000000000000000000000000000000000000000000000000000000000000
            mstore(r, add(mload(m), mul(bitShift, and(mload(add(m, 0x20)), 0x1))))
            mstore(add(r, 0x20), add(mload(add(m, 0x40)), mul(bitShift, and(mload(add(m, 0x60)), 0x1))))
            mstore(add(r, 0x40), add(mload(add(m, 0x80)), mul(bitShift, and(mload(add(m, 0xa0)), 0x1))))
        }
    }
}
