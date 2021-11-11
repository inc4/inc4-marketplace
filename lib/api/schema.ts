import {GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLScalarType, GraphQLSchema, GraphQLString} from "graphql";

import {TokensCollection} from "../types/mongo";

const TokenOwnersType = new GraphQLScalarType({
  name: "TokenOwners",
  serialize(val) {
    return val
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
        // todo if possible: filter owners by value != 0
        return TokensCollection.find({tokenType: {$ne: null}});
      }
    }
  })
});


export const schema = new GraphQLSchema({
  query: RootQuery,
});
