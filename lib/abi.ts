export const abi = [
  {
    "name": "supportsInterface",
    "inputs": [{"internalType": "bytes4", "name": "interfaceId", "type": "bytes4"}],
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },

  // check approve

  {  // erc20
    "name": "allowance",
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {  // erc721
    "name": "getApproved",
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {  // erc1155
    "name": "isApprovedForAll",
    "inputs": [
      {"internalType": "address", "name": "account", "type": "address"},
      {"internalType": "address", "name": "operator", "type": "address"}
    ],
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },

  // ggt token metadata
  {  // erc721
    "name": "tokenURI",
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  { // erc1155
    "name": "uri",
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
]
