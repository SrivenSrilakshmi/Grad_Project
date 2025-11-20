const typeDefs = `
type Query {
  users: [User]
  user(id: ID!): User
}

type Mutation {
  createUser(input: CreateUserInput!): User
  login(email: String!, password: String!): AuthPayload
}

type User {
  id: ID!
  email: String!
  name: String
  role: Role!
}

input CreateUserInput {
  email: String!
  password: String!
  name: String
}

type AuthPayload {
  token: String!
  user: User!
}

enum Role {
  USER
  ADMIN
}
`;

export default typeDefs;