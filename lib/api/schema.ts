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

import {Order, TokensCollection, Tokens} from "../types/mongo";
import {OrderFront} from "../types/common";
import {Marketplace} from "../marketplace";

const GraphQLUpload = require("graphql-upload")

// import {util} from "prettier";
// import skip = util.skip;


export function schema(marketplace: Marketplace): GraphQLSchema {
  const PageInfoType = new GraphQLObjectType({
    name: "PageInfo",
    fields: () => ({
      hasNext: {type: GraphQLBoolean},
      nextCursor: {type: GraphQLString}
    })
  });


  const Page = (itemType: any, pageName: any) => {
    return new GraphQLObjectType({
      name: pageName,
      fields: () => ({
        results: {type: new GraphQLList(itemType)},
        pageInfo: {type: PageInfoType}
      })
    });
  }


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

  const EventType = new GraphQLObjectType({
    name: "Event",
    fields: () => ({
      from: {type: GraphQLString},
      to: {type: GraphQLString},
      quantity: {type: GraphQLInt},
      timestamp: {type: GraphQLInt},
      txHash: {type: GraphQLString},
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
      events: {type: new GraphQLList(EventType)}
    })
  });


  const TokensCollectionType = new GraphQLObjectType({
    name: "TokensCollection",
    fields: () => ({
      contractAddress: {type: GraphQLString},
      tokenType: {type: GraphQLInt},
      owner: {type: GraphQLString},
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

      getTokens: {
        type: Page(TokenType, "AllTokensPage"),
        args: {
          first: {type: GraphQLInt},
          cursor: {type: GraphQLString }
        },
        resolve: async (_, args) => {
          args.cursor = args.cursor === null ? undefined : args.cursor;

          return Tokens
              .find({})
              .sort({last_update: -1})
              .limit(args.first)
              .paginate(args.cursor)  // noinspection
        }
      },

      getTokensByOwner: {
        type: Page(TokenType, "TokensByOwnerPage"),
        args: {
          owner: {type: GraphQLString},
          first: {type: GraphQLInt},
          cursor: {type: GraphQLString }
        },
        resolve: async (_, args) => {
          args.cursor = args.cursor === null ? undefined : args.cursor;

          return Tokens
            .find({[`owners.${args.owner}`]: {$gt: 0}})
            .sort({last_update: -1})
            .limit(args.first)
            .paginate(args.cursor)  // noinspection
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
      },

      uploadFile: {
        type: GraphQLBoolean,
        args: {file: {type: GraphQLUpload}},
        resolve: async (_, args) => {
          const { createReadStream, filename, mimetype, encoding } = await args.file;
          const stream = createReadStream();

          // Do magic

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
