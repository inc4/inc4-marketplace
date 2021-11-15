import { model, Schema } from 'mongoose';

// todo https://mongoosejs.com/docs/typescript.html


/**
 * Opensea docs: https://docs.opensea.io/docs/metadata-standards
 * ERC1155: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md
 * ERC721: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
 */
export const Metadata = new Schema({
  name: String,
  description: String,
  image: String,
  media_url: String,
  external_url: String,
  background_color: String,
}, { _id: false });


const TokenTransferEventSchema = new Schema({
  from: String,
  to: String,
  quantity: Number,
  timestamp: Number,
  txHash: String,
}, { _id: false });

const TokenSchema = new Schema({
  tokenId: String,

  metadata_uri: String,
  metadata: Metadata,

  last_update: Number,
  owners: { type: Map, of: Number },
  events: [TokenTransferEventSchema],
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
