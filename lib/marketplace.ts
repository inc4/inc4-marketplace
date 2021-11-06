import {Contract, ethers} from "ethers";
import abi from "./abi.json";
import {OrderFront, OrderPartFront, TokenType} from "./types/common";
import {MarketplaceData, Order, TokensCollection} from "./types/mongo";
import {EventLogger} from "./event_logger";

export class Marketplace {

  contract: Contract;
  eventLogger: EventLogger;

  constructor(contract: Contract) {
    this.contract = contract;
    this.eventLogger = new EventLogger(this);
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

  async getOrder(orderId: any) {
    return await Order.find({_id: orderId}).exec();
  }

  async getTokens() {
    return await TokensCollection.find().exec();
  }


  async checkApprove(data: OrderPartFront): Promise<boolean> {
    const tokenType = data.tokenType
    const contract = this.getContractCaller(data.contractAddress);

    if (tokenType == TokenType.ERC20)
      return await contract.allowance(data.user, this.contract.address) >= data.quantity;

    if (tokenType == TokenType.ERC721)
      return await contract.getApproved(data.tokenId) == this.contract.address;

    if (tokenType == TokenType.ERC1155)
      return await contract.isApprovedForAll(data.user, this.contract.address);

    throw "Wrong tokenType";

  }

  getContractCaller(address: string): Contract {
    return ethers.ContractFactory.getContract(address, abi, this.contract.signer);
  }


  async dataRead(): Promise<any> {
    return await MarketplaceData.find({}).exec()
  }

  async dataWrite(data: Object) {
    await MarketplaceData.updateOne({}, data).exec()
  }


}
