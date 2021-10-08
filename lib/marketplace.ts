import {Contract} from "ethers";
import {Offer} from "./types";
import {DatabaseMock} from "./db_mock";

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
    return this.db.createOrder(offer)
  }

  getOffer(offerId: number): Offer {
    return this.db.getOrder(offerId) as Offer;
  }

}
