import {Marketplace} from "./marketplace";
import express from 'express'
import bodyParser from 'body-parser'
import amongus from "mongoose";
import {OrderFront} from "./types/common";



export async function start(marketplace: Marketplace) {
  await amongus.connect('mongodb://root:example@localhost:27017/admin');

  const app = express()
  const jsonParser = bodyParser.json()

  app.post('/orders', jsonParser, async (req: any, res: any) => res.json(await marketplace.createOrder(OrderFront.fromJson(req.body))));
  app.get('/orders', async (req: any, res: any) => res.json(await marketplace.getOrders()));
  app.get('/orders/:orderId', async (req: any, res: any) => res.json(await marketplace.getOrder(req.params.orderId)));
  app.get('/tokens', async (req: any, res: any) => res.json(await marketplace.getTokens()));


  console.log("starting")
  app.listen(8080);

}

