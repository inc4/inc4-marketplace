import {ethers} from "ethers";

export enum TokenType {
  ETH,
  ERC20,
  ERC721,
  ERC1155
}

export class OrderPartFront {
  tokenType: TokenType
  contractAddress: string
  tokenId: string
  user: string
  quantity: number
  endTime: number


  constructor(tokenType: TokenType, contractAddress: string, tokenId: string, user: string, quantity: number, endTime: number) {
    this.tokenType = tokenType;
    this.contractAddress = contractAddress;
    this.tokenId = tokenId;
    this.user = user;
    this.quantity = quantity;
    this.endTime = endTime;
  }

  static fromJson(obj: OrderPartFront): OrderPartFront {
    return new OrderPartFront(obj.tokenType, obj.contractAddress, obj.tokenId, obj.user, obj.quantity, obj.endTime)
  }

  pack() {
    return ethers.utils.solidityPack(
      ['uint8', 'address', 'address', 'uint256', 'uint256', 'uint256'],
      [this.tokenType, this.contractAddress, this.user, this.tokenId, this.quantity, this.endTime]
    );
  }
}

export class OrderFront {
  left: OrderPartFront
  right: OrderPartFront
  signature: string = ""
  nonce: number


  constructor(left: OrderPartFront, right: OrderPartFront, nonce: number) {
    this.left = left;
    this.right = right;
    this.nonce = nonce;
  }

  static fromJson(obj: OrderFront): OrderFront {
    const order = new OrderFront(OrderPartFront.fromJson(obj.left), OrderPartFront.fromJson(obj.right), obj.nonce)
    order.setSignature(obj.signature)
    return order
  }

  setSignature(signature: string) {
    this.signature = signature
  }

  toMessage() {
    const messageParts = [this.left.pack(), this.right.pack(), ethers.utils.solidityPack(['uint256'], [this.nonce])]
    return ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.hexConcat(messageParts)));
  };

  checkSign() {
    const signer = ethers.utils.verifyMessage(this.toMessage(), this.signature)
    return signer == this.left.user
  };

  toCallData(): OrderSol {
    const {r, s, v} = ethers.utils.splitSignature(ethers.utils.arrayify(this.signature ?? ""))
    return {
      left: this.left,
      right: this.right,
      nonce: this.nonce,
      sig: {r, s, v},
    };
  }


}


export type OrderSol = {
  left: OrderPartFront,
  right: OrderPartFront,
  nonce: number,
  sig: {
    r: string
    s: string
    v: number
  }
}
