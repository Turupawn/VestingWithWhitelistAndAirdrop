// SPDX-License-Identifier: MIT

pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenTimelock is Ownable {
  ERC20 public token = ERC20(0x6794E47f79d968328a7050339001DCDFB2fFb8d9);
  uint public ENTRY_PRICE = 0.5 ether;
  uint public INITIAL_UNLOCK_AMOUNT = 10 ether;
  uint public AMOUNT_PER_UNLOCK = 5 ether;
  uint public UNLOCK_COUNT = 4;

  mapping(uint8 => uint256) public unlock_time;
  mapping(address => bool) public is_beneficiary;
  mapping(address => mapping(uint => bool)) public beneficiary_has_claimed;

  mapping(uint => address) public initial_token_unlock_addresses;
  uint public initial_token_unlock_addresses_count;

  mapping(address => bool) public whitelist;

  // Public functions
  
  function claim(uint8 unlock_number) public {
    require(unlock_number < UNLOCK_COUNT, "Must be below unlock count.");
    require(block.timestamp >= unlock_time[unlock_number], "Must have reached unlock time.");
    require(is_beneficiary[msg.sender], "Beneficiary must be beneficiary.");
    require(beneficiary_has_claimed[msg.sender][unlock_number] == false, "Beneficiary should not have claimed.");
    require(whitelist[msg.sender],"Sender must be whitelisted");

    beneficiary_has_claimed[msg.sender][unlock_number] = true;

    token.transfer(msg.sender, AMOUNT_PER_UNLOCK);
  }

  function buy() public payable
  {
    require(whitelist[msg.sender], "You must be whitelisted.");
    require(!is_beneficiary[msg.sender], "You already are a beneficiary.");
    require(msg.value == ENTRY_PRICE, "Must pay the entry price.");
    
    initial_token_unlock_addresses[initial_token_unlock_addresses_count] = msg.sender;
    initial_token_unlock_addresses_count += 1;

    is_beneficiary[msg.sender] = true;
  }

  // Admin functions

  function releaseInitialUnlockAmount() public onlyOwner
  {
    for(uint i; i < initial_token_unlock_addresses_count; i++)
    {
      if(is_beneficiary[initial_token_unlock_addresses[i]])
      {
        token.transfer(initial_token_unlock_addresses[i], INITIAL_UNLOCK_AMOUNT);
      }
    }
    INITIAL_UNLOCK_AMOUNT = 0;
  }

  function setEntryPrice(uint entry_price) public onlyOwner
  {
    ENTRY_PRICE = entry_price;
  }

  function setInitialUnlockAmount(uint initial_unlock_amount) public onlyOwner
  {
    INITIAL_UNLOCK_AMOUNT = initial_unlock_amount;
  }

  function setAmountPerUnlock(uint amount_per_unlock) public onlyOwner
  {
    AMOUNT_PER_UNLOCK = amount_per_unlock;
  }

  function setUnlockCount(uint unlock_count) public onlyOwner
  {
    UNLOCK_COUNT = unlock_count;
  }

  function setUnlockTimes(uint[] memory unlock_times) public onlyOwner
  {
    setUnlockCount(unlock_times.length);
    for(uint8 i; i<unlock_times.length; i++)
    {
      unlock_time[i] = unlock_times[i];
    }
  }

  function editWhitelist(address[] memory addresses, bool value) public onlyOwner
  {
    for(uint i; i < addresses.length; i++){
      whitelist[addresses[i]] = value;
    }
  }

  function revokeBeneficiary(address beneficiary) public onlyOwner
  {
    whitelist[beneficiary] = false;
    is_beneficiary[beneficiary] = false;
  }

  function withdrawETH() public onlyOwner
  {
    (bool sent, bytes memory data) = address(owner()).call{value: address(this).balance}("");
    require(sent, "Failed to send Ether");
    data;
  }

  function withdrawTokens() public onlyOwner
  {
    token.transfer(address(owner()), token.balanceOf(address(this)));
  }
}