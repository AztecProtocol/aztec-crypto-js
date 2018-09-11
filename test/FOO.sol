pragma solidity ^0.4.23;
pragma experimental ABIEncoderV2;

contract FOO {
    struct Coordinates {
        uint256 x;
        uint256 y;
    }
    Coordinates[] coords;
    event Debug(uint num);

    function loopCoords0() public returns (bool) {
        for (uint i = 0; i < coords.length; i++) {
            emit Debug(coords[i].x);
            emit Debug(coords[i].y);
        }
        return true;
    }

    function loopCoords1(Coordinates[] coords1) public returns (bool) {
        for (uint i = 0; i < coords1.length; i++) {
            emit Debug(coords1[i].x);
            emit Debug(coords1[i].y);
        }
        return true;
    }

    function singleCoord(uint index) public {
        emit Debug(coords[index].x);
        emit Debug(coords[index].y);
    }

    function coordMaker(uint x_coord, uint y_coord) public {
        coords.push(Coordinates(x_coord, y_coord));
    }
}