import { Marketplace } from "../marketplace";
import express from 'express'
import bodyParser from 'body-parser'
import { OrderFront } from "../types/common";
import { graphqlHTTP } from "express-graphql";
import { schema } from "./schema";


export async function start(marketplace: Marketplace) {

  const app = express()
  const jsonParser = bodyParser.json()

  app.use(
    "/graphql",
    graphqlHTTP({
      schema: schema,
      graphiql: true,
    }));

  app.post('/orders', jsonParser, async (req: any, res: any) => res.json(await marketplace.createOrder(OrderFront.fromJson(req.body))));
  app.get('/orders', async (req: any, res: any) => res.json(await marketplace.getOrders()));
  app.get('/orders/:orderId', async (req: any, res: any) => res.json(await marketplace.getOrder(req.params.orderId)));
  app.get('/tokens', async (req: any, res: any) => res.json(await marketplace.getTokens()));
  app.post('/asset/create', async (req: any, res: any) => res.set('Status Code', 202));


  console.log("starting")
  app.listen(8080);

}

