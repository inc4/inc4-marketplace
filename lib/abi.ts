export const calls = [
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
  },
];

export const events = {
  TransferSingle: {
    "name": "TransferSingle",
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "operator", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "id", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}
    ],
    "type": "event"
  },

  TransferBatch: {
    "name": "TransferBatch",
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "operator", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
      {"indexed": false, "internalType": "uint256[]", "name": "ids", "type": "uint256[]"},
      {"indexed": false, "internalType": "uint256[]", "name": "values", "type": "uint256[]"}
    ],
    "type": "event"
  },

  Transfer: {
    "name": "Transfer",
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
      {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "type": "event"
  },


  URI: {
    "name": "URI",
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "string", "name": "value", "type": "string"},
      {"indexed": true, "internalType": "uint256", "name": "id", "type": "uint256"}
    ],
    "type": "event"
  },
}
