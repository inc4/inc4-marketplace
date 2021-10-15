import {ethers} from "hardhat";
import {Signer} from "ethers";


export enum TokenType {
  ETH,
  ERC20,
  ERC721,
  ERC1155
}

export class TokenContract {
  tokenType: TokenType
  address: string
  name: string

  constructor(tokenType: TokenType, address: string, name: string) {
    this.tokenType = tokenType;
    this.address = address;
    this.name = name;
  }
}

export class TokenData {
  tokenContract: TokenContract
  tokenId: bigint;
  owner: string
  quantity: bigint


  constructor(tokenContract: TokenContract, tokenId: bigint, owner: string, quantity: bigint) {
    // todo checks
    // erc721 quantity == 1
    // erc20 tokenId == 0
    // eth tokenContract, tokenId == 0

    this.tokenContract = tokenContract;
    this.tokenId = tokenId;
    this.owner = owner;
    this.quantity = quantity;

  }

  static id(contract: string, tokenId: bigint): string {
    return `${contract}_${tokenId}`
  }

}

export class TokenOrderData {
  token: TokenData
  quantity: bigint

  startTime: number
  endTime: number


  constructor(token: TokenData, quantity: bigint, endTime: number) {
    this.token = token;
    this.quantity = quantity;
    this.startTime = 0;
    this.endTime = endTime;
  }

  toOrderPart(): OrderPart {
    const c = this.token.tokenContract;
    return new OrderPart(c.tokenType, c.address, this.token.owner, this.token.tokenId, this.quantity, this.endTime)
  }

}

export class Offer {
  // user create Offer: swap own LEFT order with user that accept offer with his RIGHT order
  // 1) left user signs left and right orders
  // 2) right user accepts offer calling smart-contract with left and right orders

  // left order token must be approved (eth not working)


  left: TokenOrderData
  right: TokenOrderData

  signature: string | null = null;

  constructor(first: TokenOrderData, second: TokenOrderData) {
    this.left = first;
    this.right = second;
  }

  async sign(signer: Signer) {
    this.signature = await signer.signMessage(this.toMessage())
    return this;
  }

  toCallData() {
    const {r, s, v} = ethers.utils.splitSignature(ethers.utils.arrayify(this.signature ?? ""))
    return {
      left: this.left.toOrderPart(),
      right: this.right.toOrderPart(),
      sig: {r, s, v},
    };
  }

  toMessage() {
    const messages = [this.left, this.right].map(i => i.toOrderPart().pack());
    return ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.hexConcat(messages)))
  }

  checkSign(): boolean {
    if (this.sign == null)
      throw "Sign is null"
    const signer = ethers.utils.verifyMessage(this.toMessage(), this.signature ?? "")  // todo wtf typescript
    return signer == this.left.token.owner
  }

}

export class Auction {
  tokenData: TokenOrderData
  minPrice: number;

  starttime: number


  constructor(tokenData: TokenOrderData, minPrice: number) {
    this.tokenData = tokenData;
    this.minPrice = minPrice;
    this.starttime = 0;
  }
}


export class Bid extends Offer {
  auction: Auction;


  constructor(bid: TokenOrderData, auction: Auction) {
    super(bid, auction.tokenData);
    this.auction = auction;
  }

}


// type for use in smart contracts
export class OrderPart {
  tokenType: number
  contractAddress: string
  user: string
  tokenId: bigint;
  quantity: bigint;
  endTime: number;


  constructor(tokenType: number, contractAddress: string, user: string, tokenId: bigint, quantity: bigint, endTime: number) {
    this.tokenType = tokenType;
    this.contractAddress = contractAddress;
    this.user = user;
    this.tokenId = tokenId;
    this.quantity = quantity;
    this.endTime = endTime;
  }

  pack(): string {
    return ethers.utils.solidityPack(
      ['uint8', 'address', 'address', 'uint256', 'uint256', 'uint256'],
      [this.tokenType, this.contractAddress, this.user, this.tokenId, this.quantity, this.endTime]
    );
  }
}
