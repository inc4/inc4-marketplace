import {Contract} from "ethers";
import {Offer, OrderPart, TokenType} from "./types";
import {DatabaseMock} from "./db_mock";
import {ethers} from "hardhat";
import abi from "./abi.json";

export class Marketplace {

  contract: Contract
  db: DatabaseMock

  constructor(contract: Contract, db: DatabaseMock) {
    this.contract = contract;
    this.db = db
  }

  async makeOffer(offer: Offer): Promise<number> {
    if (!offer.checkSign())
      throw "Wrong sign";
    if (!await this.checkApprove(offer.left))
      throw "Need approve";

    return this.db.createOrder(offer)
  }

  getOffer(offerId: number): Offer {
    return this.db.getOrder(offerId) as Offer;
  }


  async checkApprove(data: OrderPart): Promise<boolean> {
    const tokenType = data.token.tokenContract.tokenType
    const contract = await this.getContract(data.token.tokenContract.address);

    if (tokenType == TokenType.ERC20)
      return await contract.allowance(data.token.owner, this.contract.address) >= data.quantity;

    if (tokenType == TokenType.ERC721)
      return await contract.getApproved(data.token.tokenId) == this.contract.address;

    if (tokenType == TokenType.ERC1155)
      return await contract.isApprovedForAll(data.token.owner, this.contract.address);

    throw "Wrong tokenType";

  }


  async getContract(address: string): Promise<Contract> {
    return await ethers.getContractAt(abi, address);
  }

}
