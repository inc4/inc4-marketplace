import { Marketplace } from "../marketplace";
import { schema } from "./schema";
// import { ApolloServer} from "apollo-server";
const ApolloServer = require('apollo-server-express');
const express = require("express")


export async function start(marketplace: Marketplace) {
  const server = new ApolloServer({ schema: schema(marketplace) })
  server.listen({port: 8080}).then(
      () => { console.log("ready at 8080") }
  ).catch((err) => {console.log(err)});
}

