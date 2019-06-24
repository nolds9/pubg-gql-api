const fetch = require("node-fetch");
const { ApolloServer, gql } = require("apollo-server-express");
const express = require("express");
const { validateArgs, validateResponse, validateApiKey } = require("./utils");

require("dotenv").config();

const typeDefs = gql`
  enum GameMode {
    solo
    duo
    squad
  }

  type Query {
    getAccountId(username: String!): String!
    getLifetimeStats(
      accountId: String!
      gameMode: GameMode! = solo
      perspective: String!
    ): GameModeStats!
  }

  type GameModeStats {
    assists: Float
    bestRankPoint: Float
    boosts: Float
    dBNOs: Float
    dailyKills: Float
    dailyWins: Float
    damageDealt: Float
    days: Float
    headshotKills: Float
    heals: Float
    killPoints: Float
    kills: Float
    longestKill: Float
    longestTimeSurvived: Float
    losses: Float
    maxKillStreaks: Float
    mostSurvivalTime: Float
    rankPoints: Float
    rankPointsTitle: String
    revives: Float
    rideDistance: Float
    roadKills: Float
    roundMostKills: Float
    roundsPlayed: Float
    suicides: Float
    swimDistance: Float
    teamKills: Float
    timeSurvived: Float
    top10s: Float
    vehicleDestroys: Float
    walkDistance: Float
    weaponsAcquired: Float
    weeklyKills: Float
    weeklyWins: Float
    winPoints: Float
    wins: Float
  }
`;

const resolvers = {
  Query: {
    getAccountId,
    getLifetimeStats
  }
};

const baseUrl = "https://api.pubg.com/shards/steam/";
const apiHeaders = {
  accept: "application/vnd.api+json",
  Authorization: `Bearer ${process.env.PUBG_API_KEY}`
};

async function getAccountId(_, args = {}) {
  validateArgs(args, ["username"]);
  validateApiKey();

  const { username = "" } = args;

  const url = `${baseUrl}players?filter[playerNames]=${username}`;

  const response = await fetch(url, {
    method: "get",
    headers: apiHeaders
  }).then(res => res.json());

  validateResponse(response, true);

  const player = response.data[0];

  return player.id || "";
}

async function getLifetimeStats(_, args) {
  validateArgs(args, ["accountId", "gameMode", "perspective"]);
  validateApiKey();

  const { accountId = "", gameMode = "solo", perspective = "fpp" } = args;
  const url = `${baseUrl}players/${accountId}/seasons/lifetime`;

  const response = await fetch(url, {
    method: "get",
    headers: apiHeaders
  }).then(res => res.json());

  validateResponse(response);

  const gameModeKey = perspective === "fpp" ? `${gameMode}-fpp` : gameMode;
  const stats =
    (response.data.attributes && response.data.attributes.gameModeStats) || {};

  return stats[gameModeKey] || {};
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
