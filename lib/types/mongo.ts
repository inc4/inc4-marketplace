import mongoose, {model} from 'mongoose';
import {ethers} from "hardhat";

const {Schema} = mongoose;

// todo big number ?


export const TokenSchema = new Schema({
  tokenId: String,

  owner: String,
  quantity: Number,
}, {_id: false});


export const TokenContractSchema = new Schema({
  chainId: Number,

  address: String,

  tokenType: Number,
  name: String,

  tokens: [TokenSchema]
});

export const TokenContract = model('TokenContract', TokenContractSchema);


export const OrderPart = new Schema({
  tokenType: Number,
  contractAddress: String,
  tokenId: String,

  quantity: Number,
  user: String,
  endTime: Number,
});


export const Order = model('Order', new Schema({
  chainId: Number,
  left: OrderPart,
  right: OrderPart,

  nonce: Number,
  signature: String
}));

