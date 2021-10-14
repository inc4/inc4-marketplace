import {Offer, TokenContract, TokenData} from "./types";

export class DatabaseMock {
  contracts: { [address: string]: TokenContract } = {}
  tokens: { [token: string]: TokenData } = {}
  offers: Offer[] = []


  setContract(contract: TokenContract) {
    this.contracts[contract.address] = contract;
  }

  getContract(address: string): TokenContract {
    return this.contracts[address];
  }

  updateToken(contract: TokenContract, user: string, tokenId: bigint, valueD: bigint) {
    const tid = TokenData.id(contract.address, tokenId);
    let token = this.tokens[tid];
    if (token === undefined)
      token = new TokenData(contract, tokenId, user, 0n)

    token.quantity += valueD;
    if (token.quantity < 0) throw "ashgdojkashd";

    this.tokens[tid] = token;
  }


  createOrder(order: Offer): number {
    return this.offers.push(order) - 1;
  }

  getOrder(orderId: number): Offer {
    return this.offers[orderId];
  }

  removeOrder(orderId: number) {
    delete this.offers[orderId];
  }

}
