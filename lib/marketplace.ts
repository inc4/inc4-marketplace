import {Contract} from "ethers";
import {ethers} from "hardhat";
import abi from "./abi.json";
import {OrderFront, OrderPartFront, TokenType} from "./types/common";
import {Order, TokenContract} from "./types/mongo";

export class Marketplace {

  contract: Contract

  constructor(contract: Contract) {
    this.contract = contract;
  }

  async createOrder(orderFront: OrderFront) {
    if (!orderFront.checkSign())
      throw "Wrong sign";
    if (!await this.checkApprove(orderFront.left))
      throw "Need approve";

    const order = new Order(orderFront);
    await order.save()
  }


  // todo sort by last update time
  async getOrders() {
    return await Order.find().exec();
  }

  async getTokens() {
    return await TokenContract.find().exec();
  }


  async checkApprove(data: OrderPartFront): Promise<boolean> {
    const tokenType = data.tokenType
    const contract = await this.getContractCaller(data.contractAddress);

    if (tokenType == TokenType.ERC20)
      return await contract.allowance(data.user, this.contract.address) >= data.quantity;

    if (tokenType == TokenType.ERC721)
      return await contract.getApproved(data.tokenId) == this.contract.address;

    if (tokenType == TokenType.ERC1155)
      return await contract.isApprovedForAll(data.user, this.contract.address);

    throw "Wrong tokenType";

  }

  async getContractCaller(address: string): Promise<Contract> {
    return await ethers.getContractAt(abi, address);
  }

}
