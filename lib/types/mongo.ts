import mongoose, {model} from 'mongoose';
import {ethers} from "hardhat";

const {Schema} = mongoose;

// todo big number ?


export const TokenSchema = new Schema({
  tokenId: Number,

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
  contract: String,
  tokenId: Number,

  quantity: Number,
  user: String,
  endTime: Number,
});


const orderSchema = new Schema({
  left: OrderPart,
  right: OrderPart,

  nonce: Number,
  signature: String
});

orderSchema.methods.toCallData = function () {
  const callDataPart = (part: any) => {
    return {
      tokenType: part.contract.tokenType,
      contractAddress: part.contract.address,
      user: part.user,
      tokenId: part.tokenId,
      quantity: part.quantity,
      endTime: part.endTime
    };
  }
  const {r, s, v} = ethers.utils.splitSignature(ethers.utils.arrayify(this.signature))
  return {
    left: callDataPart(this.left),
    right: callDataPart(this.right),
    nonce: this.nonce,
    sig: {r, s, v},
  };
};


export const Order = model('Order', orderSchema);

