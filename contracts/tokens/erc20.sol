pragma solidity ^0.4.24;


/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 *
 */
contract ERC20 {
    function totalSupply() public view returns (uint256);

    function balanceOf(address _who) public view returns (uint256);

    function transfer(address _to, uint256 _value) public returns (bool);
  
    function approve(address _spender, uint256 _value) public returns (bool);
  
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool);


    /// @dev the delegatedTransfer function takes an ECDSA signature as part of its input parameters
    /// and uses the signature to validate that msg.sender has been correctly permissioned
    /// @param r ecdsa signature parameter
    /// @param s ecdsa signature parameter
    /// @param v ecdsa signature parameter
    /// @notice the ecdsa signature message is constructed from the parameters in Signature
    /// the ecdsa signature effectively supercedes (and sets) the value that is set in 'approve[msg.sender]'
    function delegatedTransfer(address _from, address _to, uint256 _value, bytes32 r, bytes32 s, uint8 v) public returns (bool);

    struct Signature {
        address delegate; ///@dev who is being authorized
        uint256 amount; ///@dev how much this delegate can spend
        uint256 nonce; ///@dev signature nonce, increased once per signature
    }

    /// @dev enables a user to revoke a signature they have provided to a third party
    /// if the signature is valid, `nonce[delegate]` is incremented by 1 and approve[delegate] is set to 0
    /// @notice the ecdsa signature message is the same as in `delegatedTransfer`
    function invalidateSignature(address delegate, uint256 value, bytes32 r, bytes32 s, uint8 v) public returns (bool);

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
}