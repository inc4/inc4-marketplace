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

import {Order, TokensCollection} from "../types/mongo";
import {OrderFront} from "../types/common";
import {Marketplace} from "../marketplace";


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
      tokenId: {type: GraphQLString},
      metadata: {type: MetadataType},
      owners: {type: TokenOwnersType},
    })
  });


  const TokensCollectionType = new GraphQLObjectType({
    name: "TokensCollection",
    fields: () => ({
      contractAddress: {type: GraphQLString},
      tokenType: {type: GraphQLInt},
      owner: {type: GraphQLString},
      tokens: {type: new GraphQLList(TokenType),}
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
        resolve: () => {
          return TokensCollection
            .find({tokenType: {$ne: null}})
            .sort({'tokens.last_update': 1});
        }
      },
      getTokensByOwner: {
        type: new GraphQLList(TokensCollectionType),
        args: {owner: {type: GraphQLString}},
        resolve: (_, args) => {
          return TokensCollection.find({
            tokenType: {$ne: null},
            tokens: {$elemMatch: {[`owners.${args.owner}`]: {$gt: 0}}}
          })
        }
      },

      orders: {
        type: new GraphQLList(OrderType),
        resolve: () => {
          return Order.find({}).sort({createTime: 1})
        }
      },

      getOrdersByToken: {
        type: new GraphQLList(OrderType),
        args: {
          contractAddress: {type: GraphQLString},
          tokenId: {type: GraphQLString},
        },
        resolve: (_, args) => {
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
