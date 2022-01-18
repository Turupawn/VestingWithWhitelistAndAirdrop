const NETWORK_ID = 4
const CONTRACT_ADDRESS = "0x388452282642Fd325BC95D09551f4349e9A2C78E"
const JSON_CONTRACT_ABI_PATH = "./ContractABI.json"
var contract
var accounts
var web3
var ENTRY_PRICE

function metamaskReloadCallback() {
  window.ethereum.on('accountsChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Se cambió el account, refrescando...";
    window.location.reload()
  })
  window.ethereum.on('networkChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Se el network, refrescando...";
    window.location.reload()
  })
}

const getWeb3 = async () => {
  return new Promise((resolve, reject) => {
    if(document.readyState=="complete")
    {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum)
        window.location.reload()
        resolve(web3)
      } else {
        reject("must install MetaMask")
        document.getElementById("web3_message").textContent="Error: Porfavor conéctate a Metamask";
      }
    }else
    {
      window.addEventListener("load", async () => {
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum)
          resolve(web3)
        } else {
          reject("must install MetaMask")
          document.getElementById("web3_message").textContent="Error: Please install Metamask";
        }
      });
    }
  });
};

const getContract = async (web3) => {
  const response = await fetch(JSON_CONTRACT_ABI_PATH);
  const data = await response.json();
  
  const netId = await web3.eth.net.getId();
  contract = new web3.eth.Contract(
    data,
    CONTRACT_ADDRESS
    );
  return contract
}

async function loadDapp() {
  metamaskReloadCallback()
  document.getElementById("web3_message").textContent="Please connect to Metamask"
  var awaitWeb3 = async function () {
    web3 = await getWeb3()
    web3.eth.net.getId((err, netId) => {
      if (netId == NETWORK_ID) {
        var awaitContract = async function () {
          contract = await getContract(web3);
          await window.ethereum.request({ method: "eth_requestAccounts" })
          accounts = await web3.eth.getAccounts()
          document.getElementById("web3_message").textContent="You are connected to Metamask"
          onContractInitCallback()
        };
        awaitContract();
      } else {
        document.getElementById("web3_message").textContent="Please connect to Rinkeby";
      }
    });
  };
  awaitWeb3();
}

const onContractInitCallback = async () => {
  // General vars
  ENTRY_PRICE = await contract.methods.ENTRY_PRICE().call()
  INITIAL_UNLOCK_AMOUNT = await contract.methods.INITIAL_UNLOCK_AMOUNT().call()
  AMOUNT_PER_UNLOCK = await contract.methods.AMOUNT_PER_UNLOCK().call()
  UNLOCK_COUNT = await contract.methods.UNLOCK_COUNT().call()
  initial_token_unlock_addresses_count = await contract.methods.initial_token_unlock_addresses_count().call()
  
  // User vars
  user_is_beneficiary = await contract.methods.is_beneficiary(accounts[0]).call()
  user_is_whitelisted = await contract.methods.whitelist(accounts[0]).call()
  owner_address = await contract.methods.owner().call()
  user_is_owner = accounts[0] == owner_address

  var general_info = document.getElementById("general_info")

  general_info_str = "Entry price: " + web3.utils.fromWei(ENTRY_PRICE) + " ETH"
  + "<br>Initial unlock amount: " + web3.utils.fromWei(INITIAL_UNLOCK_AMOUNT) + " TGE"
  + "<br>Amunt per unlock: " + web3.utils.fromWei(AMOUNT_PER_UNLOCK) + " TGE"
  + "<br>Unlock count: " + UNLOCK_COUNT
  + "<br>Initial token unlock address count: " + initial_token_unlock_addresses_count
  + "<br>Owner: " + owner_address

  if(user_is_beneficiary)
    general_info_str += "<br>You are beneficiary"
  if(user_is_whitelisted)
    general_info_str += "<br>You are whitelisted"
  if(user_is_owner)
    general_info_str += "<br>You are owner"
  
  general_info.innerHTML = general_info_str

  if(user_is_owner)
  {
    // TODO
  }

  if(user_is_whitelisted)
  {
    var parent = document.getElementById("buy_button")
    var btn = document.createElement("button")
    btn.innerHTML = "Buy"
    btn.onclick = function (e, e, x) {
      buy()
    }
    parent.appendChild(btn)
    parent.appendChild(document.createElement("br"))
  }

  var parent = document.getElementById("claim_buttons")
  if(user_is_beneficiary)
  {
    for(i=0; i<UNLOCK_COUNT; i++)
    {
      var unlock_h = document.createElement("h3")
      unlock_h.innerHTML = "Unlock #" + (i+1)
      parent.appendChild(unlock_h)

      user_has_claimed = await contract.methods.beneficiary_has_claimed(accounts[0],i).call()
      if(!user_has_claimed)
      {
        timestamp = await contract.methods.unlock_time(i).call()
        current_time = Math.round(Date.now() / 1000)
        if(parseInt(timestamp) < current_time)
        {
          if(parseInt(timestamp) != 0)
          {
            var btn = document.createElement("button")
            btn.innerHTML = "Claim!"
            btn.unlock_number = i
            btn.onclick = function (e, e, x) {
              claim(this.unlock_number)
            }
            parent.appendChild(btn)
            parent.appendChild(document.createElement("br"))
          }else
          {
            claimed_p = document.createElement("p")
            claimed_p.innerHTML = "This timelock is still not set"
            parent.appendChild(claimed_p)
          }
        }else
        {
          claimed_p = document.createElement("p")
          claimed_p.innerHTML = "Please claim " + web3.utils.fromWei(AMOUNT_PER_UNLOCK) + " tokens on " + new Date(timestamp * 1000)
          parent.appendChild(claimed_p)
        }
      }else
      {
        claimed_p = document.createElement("p")
        claimed_p.innerHTML = "Claimed"
        parent.appendChild(claimed_p)
      }
    }
  }else
  {
    claimed_p = document.createElement("p")
    claimed_p.innerHTML = "No timelocks found for this account"
    parent.appendChild(claimed_p)
  }
}


//// PUBLIC FUNCTIONS ////

/*
PUBLIC FUNCTIONS
*/
const claim = async (unlock_number) => {
  const result = await contract.methods.claim(unlock_number)
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Claiming...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

const buy = async () => {
  const result = await contract.methods.buy()
  .send({ from: accounts[0], gas: 0, value: ENTRY_PRICE })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Buying...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    //console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

/*
ADMIN FUNCTIONS
*/

const releaseInitialUnlockAmount = async () => {
  const result = await contract.methods.releaseInitialUnlockAmount()
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Releasing initial unlock amount...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

const setEntryPrice = async (entry_price) => {
  const result = await contract.methods.setEntryPrice(entry_price)
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Setting entry price...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

const setInitialUnlockAmount = async (initial_unlock_amount) => {
  const result = await contract.methods.setInitialUnlockAmount(initial_unlock_amount)
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Setting initial unlock amount...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

const setAmountPerUnlock = async (amount_per_unlock) => {
  const result = await contract.methods.setAmountPerUnlock(amount_per_unlock)
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Setting amount per unlock...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

const setUnlockCount = async (unlock_count) => {
  const result = await contract.methods.setUnlockCount(unlock_count)
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Setting unlock count...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

const setUnlockTimes = async (unlock_times) => {
  const result = await contract.methods.setUnlockTimes(unlock_times)
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Setting unlock times...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

const editWhitelist = async (addresses, value) => {
  const result = await contract.methods.editWhitelist(addresses, value)
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Editing whitelist...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

const revokeBeneficiary = async (beneficiary) => {
  const result = await contract.methods.revokeBeneficiary(beneficiary)
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Editing whitelist...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

const withdrawETH = async () => {
  const result = await contract.methods.withdrawETH()
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Withdrawing eth...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

const withdrawTokens = async () => {
  const result = await contract.methods.withdrawTokens()
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Withdrawing tokens...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}

loadDapp()