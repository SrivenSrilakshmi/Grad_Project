const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    body: String
    author: User!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    text: String!
    author: User!
  }

  type Query {
    me: User
    users: [User!]!
    posts: [Post!]!
    postsByEmail(email: String!): [Post!]!
  }

  type Mutation {
    deleteUser(id: ID!): Boolean
    addPost(title: String!, body: String, authorId: ID!): Post!
  }
`;

module.exports = { typeDefs };