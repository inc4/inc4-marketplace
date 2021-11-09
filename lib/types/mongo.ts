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

/**
 * Schema based on https://docs.opensea.io/docs/metadata-standards
 */
const genericTokenSchema = {
  name: String,
  description: String,
  image: String,
  external_url: String,
  image_data: { type: String, required: false },
  background_color: { type: String, required: false },
  animation_url: { type: String, required: false },
  youtube_url: { type: String, required: false },
  attributes: {
    required: false,
    alias: "properties",
    type: [{
      trait_type: { type: String, required: false },
      display_type: { type: String, required: false },
      value: String // String | Number
    }],
  },
};

/**
 * ERC721 schema based on https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
 */
export const ERC721 = model('ERC721', new Schema({...genericTokenSchema}));

/**
 * ERC1155 schema based on https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md
 */
export const ERC1155 = model('ERC1155', new Schema({
  ...genericTokenSchema,
  decimals: Number,
  localization: {
    uri: String,
    default: String,
    locales: [String]
  },
}));

