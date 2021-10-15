import {ethers} from "hardhat";
import {Signer} from "ethers";


type OrderPartSol = {
  tokenType: number
  contractAddress: string
  user: string
  tokenId: bigint;
  quantity: bigint;
  endTime: number;
}


type OrderSol = {
  left: OrderPartSol,
  right: OrderPartSol,
  nonce: bigint,
  sig: {
    r: string
    s: string
    v: number
  }
}


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

export class OrderPart {
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

  toOrderPart(): OrderPartSol {
    return {
      tokenType: this.token.tokenContract.tokenType,
      contractAddress: this.token.tokenContract.address,
      user: this.token.owner,
      tokenId: this.token.tokenId,
      quantity: this.quantity,
      endTime: this.endTime
    };
  }

  pack(): string {
    return ethers.utils.solidityPack(
      ['uint8', 'address', 'address', 'uint256', 'uint256', 'uint256'],
      [this.token.tokenContract.tokenType, this.token.tokenContract.address,
        this.token.owner, this.token.tokenId, this.quantity, this.endTime]
    );
  }


}

export class Offer {
  // user create Offer: swap own LEFT order with user that accept offer with his RIGHT order
  // 1) left user signs left and right orders
  // 2) right user accepts offer calling smart-contract with left and right orders

  // left order token must be approved (eth not working)


  left: OrderPart
  right: OrderPart

  nonce: bigint
  signature: string | null = null;

  constructor(first: OrderPart, second: OrderPart) {
    this.left = first;
    this.right = second;
    this.nonce = this.someCryptorandom();
  }

  async sign(signer: Signer) {
    this.signature = await signer.signMessage(this.toMessage())
    return this;
  }

  toCallData(): OrderSol {
    const {r, s, v} = ethers.utils.splitSignature(ethers.utils.arrayify(this.signature ?? ""))
    return {
      left: this.left.toOrderPart(),
      right: this.right.toOrderPart(),
      nonce: this.nonce,
      sig: {r, s, v},
    };
  }

  toMessage() {
    const messageParts = [this.left, this.right].map(i => i.pack());
    messageParts.push(ethers.utils.solidityPack(['uint256'], [this.nonce]))
    return ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.hexConcat(messageParts)))
  }

  checkSign(): boolean {
    if (this.sign == null)
      throw "Sign is null"
    const signer = ethers.utils.verifyMessage(this.toMessage(), this.signature ?? "")  // todo wtf typescript
    return signer == this.left.token.owner
  }

  private someCryptorandom() {
    return 42n;  // todo
  }
}

export class Auction {
  tokenData: OrderPart
  minPrice: number;

  starttime: number


  constructor(tokenData: OrderPart, minPrice: number) {
    this.tokenData = tokenData;
    this.minPrice = minPrice;
    this.starttime = 0;
  }
}


export class Bid extends Offer {
  auction: Auction;


  constructor(bid: OrderPart, auction: Auction) {
    super(bid, auction.tokenData);
    this.auction = auction;
  }

}
