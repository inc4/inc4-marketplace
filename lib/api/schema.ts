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


const CollectionTokensType = new GraphQLObjectType({
  name: "CollectionTokens",
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
    collectionsTokens: {
      type: new GraphQLList(CollectionTokensType),
      resolve: () => {
        return TokensCollection.find();
      }
    }
  })
});


export const schema = new GraphQLSchema({
  query: RootQuery,
});
