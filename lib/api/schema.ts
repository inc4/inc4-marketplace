import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString
} from "graphql";

import {Page} from "./pagination"

import {Order, TokensCollection, Tokens} from "../types/mongo";
import {OrderFront} from "../types/common";
import {Marketplace} from "../marketplace";
// import {util} from "prettier";
// import skip = util.skip;


export function schema(marketplace: Marketplace): GraphQLSchema {

  const TokenOwnersType = new GraphQLScalarType({
    name: "TokenOwners",
    serialize(val: any) {
      for (let [key, value] of val) if (value == 0) val.delete(key);
      return val;
    }
  });

  const MetadataType = new GraphQLObjectType({
    name: "Metadata",
    fields: () => ({
      name: {type: GraphQLString},
      description: {type: GraphQLString},
      image: {type: GraphQLString},
      media_url: {type: GraphQLString},
      external_url: {type: GraphQLString},
      background_color: {type: GraphQLString},
    })
  });


  const TokenType = new GraphQLObjectType({
    name: "Token",
    fields: () => ({
      collectionObjectId: {type: GraphQLString},
      tokenId: {type: GraphQLString},
      metadata_uri: {type: GraphQLString},
      metadata: {type: MetadataType},
      last_update: {type: GraphQLInt},
      owners: {type: TokenOwnersType},
    })
  });


  const TokensCollectionType = new GraphQLObjectType({
    name: "TokensCollection",
    fields: () => ({
      contractAddress: {type: GraphQLString},
      tokenType: {type: GraphQLInt},
      owner: {type: GraphQLString},
      // tokens: {type: new GraphQLList(TokenType),}
    })
  });

  const OrderPartType = new GraphQLObjectType({
    name: "OrderPart",
    fields: () => ({
      tokenType: {type: GraphQLInt},
      contractAddress: {type: GraphQLString},
      tokenId: {type: GraphQLString},
      user: {type: GraphQLString},
      quantity: {type: GraphQLInt},
      endTime: {type: GraphQLInt},
    })
  });

  const OrderType = new GraphQLObjectType({
    name: "Order",
    fields: () => ({
      left: {type: OrderPartType},
      right: {type: OrderPartType},
      signature: {type: GraphQLString},
      createTime: {type: GraphQLInt},
    })
  });


  const RootQuery = new GraphQLObjectType({
    name: 'RootQuery',
    fields: () => ({
      tokensCollection: {
        type: new GraphQLList(TokensCollectionType),
        resolve: async () => {
          return TokensCollection
              .find({tokenType: {$ne: null}})
              .sort({'tokens.last_update': 1});
        }
      },

      // getTokensByOwner: {
      //   type: new GraphQLList(TokenType),
      //   args: {
      //     owner: {type: GraphQLString},
      //     limit: {type: GraphQLInt},
      //     after: {type: GraphQLInt}  // is a unix time
      //   },
      //   resolve: async (_, args) => {
      //     // return Tokens.find({[`owners.${args.owner}`]: {$gt: 0}});
      //
      //     // return Tokens
      //     //     .find({last_update: {$lte: args.after}, [`owners.${args.owner}`]: {$gt: 0}})
      //     //     .sort({last_update: -1})
      //     //     .limit(args.limit)
      //
      //
      //   }
      // },

      getTokensByOwner: {
        type: Page(TokenType),
        args: {
          owner: {type: GraphQLString},
          first: {type: GraphQLInt},
          afterCursor: {type: GraphQLInt }  // is a unix time
        },
        resolve: async (_, args) => {
          let afterIndex = 0;
          return Tokens
              .find({last_update: {$lte: args.afterCursor}, [`owners.${args.owner}`]: {$gt: 0}})
              .limit(args.first)
              .then((res) => {
                if (typeof args.afterCursor === "number") {
                  let nodeId = args.afterCursor;
                  let nodeIndex = res.findIndex(data => data.last_update === nodeId)
                  if (nodeIndex >= 0) {
                    afterIndex = nodeIndex + 1;
                  }
                }

                const edges = res.map(node => ({
                  node,
                  cursor: node.last_update
                }));

                let startCursor, endCursor = null;
                if (edges.length > 0) {
                  startCursor = edges[0].node.last_update;
                  endCursor = edges[edges.length - 1].node.last_update;
                }
                let hasNextPage = res.length > afterIndex + args.first;

                return {
                  totalCount: res.length,
                  edges,
                  pageInfo: {
                    startCursor,
                    endCursor,
                    hasNextPage
                  }
                }
              })
        }
      },

      orders: {
        type: new GraphQLList(OrderType),
        resolve: async () => {
          return Order.find({}).sort({createTime: 1})
        }
      },

      getOrdersByToken: {
        type: new GraphQLList(OrderType),
        args: {
          contractAddress: {type: GraphQLString},
          tokenId: {type: GraphQLString},
        },
        resolve: async (_, args) => {
          const {contractAddress, tokenId} = args
          const filter = {contractAddress, tokens: {tokenId}}
          return Order
              .find({$or: [
                  {left: {filter}},
                  {right: {filter}},
                ]})
              .sort({createTime: 1})
        }
      },


    })
  });


  const Mutation = new GraphQLObjectType({
    name: 'Mutations',
    fields: {
      createOrder: {
        type: GraphQLBoolean,
        args: {order: {type: new GraphQLNonNull(GraphQLString)}},
        resolve: async (_, args) => {
          const orderJson = JSON.parse(args.order);
          const order = OrderFront.fromJson(orderJson)
          await marketplace.createOrder(order);
          return true;
        }
      }
    }
  })

  return new GraphQLSchema({
    query: RootQuery,
    mutation: Mutation,
  });

}
