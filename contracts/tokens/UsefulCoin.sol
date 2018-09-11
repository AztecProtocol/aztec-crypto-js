pragma solidity ^0.4.24;

import "./erc20.sol";
import "../contractHelpers/SafeMath.sol";
import "../lib/Security/SecurityTest.sol";
import "../lib/Security/Security.sol";

contract UsefulCoin {
    using SafeMath for uint256;
    using Security for Security.ECDSASignature;

    event Transfer(
      address indexed from,
      address indexed to,
      uint256 value
    );

    event Approval(
      address indexed owner,
      address indexed spender,
      uint256 value
    );

    event DebugUint(uint256 num);
    event DebugBytes32(bytes32 message);
    event DebugAddUsefulCoin(address add);
    event DebugAddUCIsEqual(address add);

    mapping (address => uint256) private balances_;
    mapping (address => mapping (address => uint256)) private allowed_;
    mapping (address => uint256) private delegateNonces_;
    mapping (bytes32 => bool) private invalidSignatures_;
 
    uint256 private totalSupply_;

    constructor() public payable {
        totalSupply_ = 1000000 * msg.value;
        balances_[msg.sender] = totalSupply_;
    }

    function totalSupply() public view returns (uint256) {
        return totalSupply_;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances_[_owner];
    }

    function allowance(address _owner, address _spender) public view returns (uint256) {
        return allowed_[_owner][_spender];
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_value <= balances_[msg.sender], "Insufficient funds");
        require(_to != address(0), "Sending to address(0), cannot burn tokens");

        balances_[msg.sender] = balances_[msg.sender].sub(_value);
        balances_[_to] = balances_[_to].add(_value);
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        allowed_[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(_value <= balances_[_from], "Insufficient funds");
        require(_value <= allowed_[_from][msg.sender], "Insufficient funds");
        require(_to != address(0), "Sending to address(0), cannot burn tokens");

        balances_[_from] = balances_[_from].sub(_value);
        balances_[_to] = balances_[_to].add(_value);
        allowed_[_from][msg.sender] = allowed_[_from][msg.sender].sub(_value);
        emit Transfer(_from, _to, _value);
        return true;
    }

    /**
      * @dev Increase the amount of tokens that an owner allowed to a spender.
      * approve should be called when allowed_[_spender] == 0. To increment
      * allowed value is better to use this function to avoid 2 calls (and wait until
      * the first transaction is mined)
      * From MonolithDAO Token.sol
      * @param _spender The address which will spend the funds.
      * @param _addedValue The amount of tokens to increase the allowance by.
      */
    function increaseApproval(address _spender, uint256 _addedValue) public returns (bool) {
        allowed_[msg.sender][_spender] = (
        allowed_[msg.sender][_spender].add(_addedValue));
        emit Approval(msg.sender, _spender, allowed_[msg.sender][_spender]);
        return true;
    }

    /**
      * @dev Decrease the amount of tokens that an owner allowed to a spender.
      * approve should be called when allowed_[_spender] == 0. To decrement
      * allowed value is better to use this function to avoid 2 calls (and wait until
      * the first transaction is mined)
      * From MonolithDAO Token.sol
      * @param _spender The address which will spend the funds.
      * @param _subtractedValue The amount of tokens to decrease the allowance by.
      */
    function decreaseApproval(address _spender, uint256 _subtractedValue) public returns (bool) {
        uint256 oldValue = allowed_[msg.sender][_spender];
        if (_subtractedValue >= oldValue) {
            allowed_[msg.sender][_spender] = 0;
        } else {
            allowed_[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        emit Approval(msg.sender, _spender, allowed_[msg.sender][_spender]);
        return true;
    }

    function delegatedTransfer(
        address _from, 
        address _to,
        uint256 _value,
        uint256 _messageValue,
        bytes32 r,
        bytes32 s,
        uint8 v
    )
    public returns (bool) {
        Security.ECDSASignature memory signature = Security.ECDSASignature(r, s, v);
        require(signature.verifyMessageSignature(msg.sender, _messageValue, delegateNonces_[_from]) == _from, "Not Authorised");

        require(_value <= balances_[_from], "Insufficient funds");
        require(_value <= _messageValue, "Insufficient funds");
        require(_to != address(0), "Sending to address(0), cannot burn tokens");
        require(invalidSignatures_[keccak256(abi.encode(r, s, v))] == false, "Not Authorized");

        delegateNonces_[_from] = delegateNonces_[_from].add(1);
        balances_[_from] = balances_[_from].sub(_value);
        allowed_[_from][msg.sender] = allowed_[_from][msg.sender] < _value ? 0 : allowed_[_from][msg.sender].sub(_value);     
        balances_[_to] = balances_[_to].add(_value);
        emit Transfer(_from, _to, _value);
        return true;
    }

    function invalidateSignature(address delegate, uint256 _messageValue, bytes32 r, bytes32 s, uint8 v) public returns (bool) {
        Security.ECDSASignature memory signature = Security.ECDSASignature(r, s, v);
        require(
            signature.verifyMessageSignature(delegate, _messageValue, delegateNonces_[msg.sender]) == msg.sender,
            "Not authorised to invalidate this signature"
        );

        delegateNonces_[msg.sender] = delegateNonces_[msg.sender].add(1);
        allowed_[msg.sender][delegate] = 0;
        invalidSignatures_[keccak256(abi.encode(r, s, v))] = true;
        return true;
    }

    /**
      * @dev Internal function that mints an amount of the token and assigns it to
      * an account. This encapsulates the modification of balances such that the
      * proper events are emitted.
      * @param _account The account that will receive the created tokens.
      * @param _amount The amount that will be created.
      */
    function _mint(address _account, uint256 _amount) internal {
        require(_account != 0, "Sending to address(0), cannot burn tokens");
        totalSupply_ = totalSupply_.add(_amount);
        balances_[_account] = balances_[_account].add(_amount);
        emit Transfer(address(0), _account, _amount);
    }

    /**
      * @dev Internal function that burns an amount of the token of a given
      * account.
      * @param _account The account whose tokens will be burnt.
      * @param _amount The amount that will be burnt.
      */
    function _burn(address _account, uint256 _amount) internal {
        require(_account != 0, "Sending to address(0), cannot burn tokens");
        require(_amount <= balances_[_account], "Insufficient funds");

        totalSupply_ = totalSupply_.sub(_amount);
        balances_[_account] = balances_[_account].sub(_amount);
        emit Transfer(_account, address(0), _amount);
    }

    /**
      * @dev Internal function that burns an amount of the token of a given
      * account, deducting from the sender's allowance for said account. Uses the
      * internal _burn function.
      * @param _account The account whose tokens will be burnt.
      * @param _amount The amount that will be burnt.
      */
    function _burnFrom(address _account, uint256 _amount) internal {
        require(_amount <= allowed_[_account][msg.sender], "Insufficient funds");

        // Should https://github.com/OpenZeppelin/zeppelin-solidity/issues/707 be accepted,
        // this function needs to emit an event with the updated approval.
        allowed_[_account][msg.sender] = allowed_[_account][msg.sender].sub(
            _amount);
        _burn(_account, _amount);
    }
}