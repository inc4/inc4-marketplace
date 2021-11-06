import { GraphQLObjectType, GraphQLString, GraphQLID, GraphQLList, GraphQLSchema } from "graphql";


const RootQuery = new GraphQLObjectType({
  name: 'RootQuery',
  fields: {  }
});

export const schema = new GraphQLSchema({
  query: RootQuery,
});
