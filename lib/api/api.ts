import { Marketplace } from "../marketplace";
import { schema } from "./schema";
import { ApolloServer} from "apollo-server";


export async function start(marketplace: Marketplace) {
  const server = new ApolloServer({ schema: schema(marketplace) })
  server.listen({port: 8080}).then(
      () => { console.log("ready at 2289") }
  ).catch((err) => {console.log(err)});
}

