const fetch = require("node-fetch");
const { ApolloServer, gql } = require("apollo-server-express");
const express = require("express");

require("dotenv").config();

const baseUrl = "https://api.pubg.com/shards/steam/";

const typeDefs = gql`
  type Query {
    getAccountId(username: String!): String!
  }
`;

const resolvers = {
  Query: {
    getAccountId
  }
};

async function getAccountId(_, { username = "" }) {
  if (!username) {
    throw new Error("Must provide username");
  }

  if (!process.env.PUBG_API_KEY) {
    throw new Error("Must provide valid api key");
  }

  const url = `${baseUrl}players?filter[playerNames]=${username}`;
  const headers = {
    accept: "application/vnd.api+json",
    Authorization: `Bearer ${process.env.PUBG_API_KEY}`
  };

  const response = await fetch(url, {
    method: "get",
    headers
  }).then(res => res.json());

  if (
    !response ||
    !response.data ||
    !response.data.length ||
    !response.data[0]
  ) {
    throw new Error(
      "Request failed: bad request or no data for provided username"
    );
  }

  const player = response.data[0];

  return player.id || "";
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
  path: "/"
});

const app = express();
server.applyMiddleware({ app });

module.exports = app;
