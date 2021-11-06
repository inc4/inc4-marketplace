import {model, Schema} from 'mongoose';

// todo https://mongoosejs.com/docs/typescript.html


const TokenSchema = new Schema({
  tokenId: String,

  owners: {type: Map, of: Number},
}, {_id: false})

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

