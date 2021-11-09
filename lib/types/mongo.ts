import { model, Schema } from 'mongoose';

// todo https://mongoosejs.com/docs/typescript.html


const TokenSchema = new Schema({
  tokenId: String,

  metadata_uri: String,
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
 * Opensea docs: https://docs.opensea.io/docs/metadata-standards
 * ERC1155: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md
 * ERC721: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
 */
export const Metadata = model('Metadata', new Schema({
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
  decimals: { type: Number, required: false },
  localization: {
    required: false,
    type: {
      uri: String,
      default: String,
      locales: [String],
    },
  },
  original: { type: String, required: false }
}));
