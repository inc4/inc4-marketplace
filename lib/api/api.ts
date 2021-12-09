import { Marketplace } from "../marketplace";
import { schema } from "./schema";
// import { ApolloServer} from "apollo-server";
import express from "express";
import { ApolloServer } from 'apollo-server-express';
const {graphqlUploadExpress} = require("graphql-upload");

export async function start(marketplace: Marketplace) {
  const app = express();
  app.use(graphqlUploadExpress());
  const server = new ApolloServer({schema: schema(marketplace)});
  await server.start();
  server.applyMiddleware({ app });
  await new Promise<void>(resolve => app.listen({ port: 8080 }, resolve));
}
