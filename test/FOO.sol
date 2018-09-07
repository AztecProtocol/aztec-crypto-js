pragma solidity ^0.4.23;
pragma experimental ABIEncoderV2;

contract FOO {
    struct Coordinates {
        uint256 x;
        uint256 y;
    }
    event Debug(uint num);
    function loopCoords(Coordinates[] coords) public returns (bool) {
        for (uint i = 0; i < coords.length; i++) {
            emit Debug(i);
        }
        return true;
    }
    function justCoord(Coordinates coord) public {
        emit Debug(coord.x);
        emit Debug(coord.y);
    }
    function coordMaker(uint x_coord, uint y_coord) public returns (Coordinates) {
        return {x: x_coord, y: y_coord};
    }
}