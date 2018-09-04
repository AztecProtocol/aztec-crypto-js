pragma solidity ^0.4.24;


/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 *
 */
contract ERC20 {
    /**
      * @dev Total number of tokens in existence
      */
    function totalSupply() public view returns (uint256);

    /**
      * @dev Gets the balance of the specified address.
      * @param _owner The address to query the the balance of.
      * @return An uint256 representing the amount owned by the passed address.
      */
    function balanceOf(address _owner) public view returns (uint256);

    /**
      * @dev Function to check the amount of tokens that an owner allowed to a spender.
      * @param _owner address The address which owns the funds.
      * @param _spender address The address which will spend the funds.
      * @return A uint256 specifying the amount of tokens still available for the spender.
      */
    function allowance(address _owner, address _spender) public view returns (uint256);

    /**
      * @dev Transfer token for a specified address
      * @param _to The address to transfer to.
      * @param _value The amount to be transferred.
      */
    function transfer(address _to, uint256 _value) public returns (bool);
  
    /**
      * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
      * Beware that changing an allowance with this method brings the risk that someone may use both the old
      * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
      * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
      * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
      * @param _spender The address which will spend the funds.
      * @param _value The amount of tokens to be spent.
      */
    function approve(address _spender, uint256 _value) public returns (bool);
  
    /**
      * @dev Transfer tokens from one address to another
      * @param _from address The address which you want to send tokens from
      * @param _to address The address which you want to transfer to
      * @param _value uint256 the amount of tokens to be transferred
      */
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