import {Marketplace} from "./marketplace";
import {deployments, ethers, getNamedAccounts} from "hardhat";
import express from 'express'
import bodyParser from 'body-parser'
import amongus from "mongoose";
import {EventLogger} from "./event_logger";



export async function start(marketplace: Marketplace) {
  await amongus.connect('mongodb://root:example@localhost:27017/admin');




  async function createOrder(req: any, res: any) {
    await marketplace.createOrder(req.body)
    res.json({"a": "b"});
  }

  async function getOrders(req: any, res: any) {
    res.json(await marketplace.getOrders());
  }
  //
  // function getOffer(req: any, res: any) {
  //   res.json(m.getOffer(req.params.offerId));
  // }
  //
  async function getTokens(req: any, res: any) {
    res.json(await marketplace.getTokens());
  }


  const app = express()
  const jsonParser = bodyParser.json()

  app.post('/orders', jsonParser, createOrder);
  app.get('/orders', getOrders);
  // app.get('/orders/:orderId', getOffer);
  app.get('/tokens', getTokens);


  console.log("starting")
  app.listen(8080);

}

