import {Offer} from "./types";

export class DatabaseMock {
  offers: Offer[] = []




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
