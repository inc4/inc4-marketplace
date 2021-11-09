import { model, Schema } from 'mongoose';

// todo https://mongoosejs.com/docs/typescript.html


const TokenSchema = new Schema({
  tokenId: String,

  metadata: Map,

  owners: { type: Map, of: Number },
}, { _id: false })

export const TokensCollection = model('TokensCollection', new Schema({
  contractAddress: String,
  tokenType: Number,
  name: String,
  owner: String,

  tokens: [TokenSchema],
}));


export const OrderPart = new Schema({
  tokenType: Number,
  contractAddress: String,
  tokenId: String,

  quantity: Number,
  user: String,
  endTime: Number,
});


export const Order = model('Order', new Schema({
  left: OrderPart,
  right: OrderPart,

  nonce: Number,
  signature: String
}));


export const MarketplaceData = model('MarketplaceData', new Schema({
  lastBlock: Number,
}));

/* 
 * ERC721 schema based on 
 * - https://docs.opensea.io/docs/metadata-standards
 * - https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
 */
export const ERC721 = model('ERC721', new Schema({
  name: String,
  description: String,
  image: String,
  external_uri: {
    required: false,
    type: String
  },
  attributes: {
    required: false,
    type: [{
      trait_type: { type: String, required: false },
      display_type: { type: String, required: false },
      value: String // String | Number
    }]
  }
}));
