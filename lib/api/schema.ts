import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLSchema,
  GraphQLInt,
  GraphQLScalarType
} from "graphql";

import {TokensCollection} from "../types/mongo";

const DictOwnersType = new GraphQLScalarType({
  name: "DictOwners",
  serialize(val){
    // send value as response
    return val
  }
});


const PseudoTokenType = new GraphQLObjectType({
  name: "PseudoToken",
  fields: () => ({
    tokenId: { type: GraphQLString },
    metadata_: { type: GraphQLString },
    owners: {
      type: DictOwnersType
    }
  })
});


const CollectionTokensType = new GraphQLObjectType({
  name: "CollectionTokens",
  fields: () => ({
    contractAddress: { type: GraphQLString },
    tokenType: { type: GraphQLInt },
    owner: { type: GraphQLString },
    tokens: {
      type: new GraphQLList(PseudoTokenType),
    }
  })
});


const RootQuery = new GraphQLObjectType({
  name: 'RootQuery',
  fields: () => ({
    collectionsTokens: {
      type: new GraphQLList(CollectionTokensType),
      resolve: () => { return TokensCollection.find(); }
    }
  })
});


export const schema = new GraphQLSchema({
  query: RootQuery,
});
