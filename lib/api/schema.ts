import {GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLScalarType, GraphQLSchema, GraphQLString} from "graphql";

import {TokensCollection} from "../types/mongo";

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
  })
});

export const schema = new GraphQLSchema({
  query: RootQuery,
});
