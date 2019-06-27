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

  enum Perspective {
    fpp
    tpp
  }

  type Query {
    getAccountId(username: String!): ID!
    getLifetimeStats(
      accountId: ID!
      gameMode: GameMode = solo
      perspective: Perspective = fpp
    ): GameModeStats!
    getSeasons: [SeasonMeta!]!
    getCurrentSeason: SeasonMeta
    getSeasonStats(
      accountId: ID!
      seasonId: ID!
      gameMode: GameMode = solo
      perspective: Perspective = fpp
    ): GameModeStats!
  }

  type SeasonMeta {
    id: ID!
    isCurrentSeason: Boolean!
    isOffSeason: Boolean!
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
    getLifetimeStats,
    getSeasons,
    getCurrentSeason,
    getSeasonStats
  }
};

const baseUrl = "https://api.pubg.com/shards/steam/";
const apiHeaders = {
  accept: "application/vnd.api+json",
  Authorization: `Bearer ${process.env.PUBG_API_KEY}`
};

async function fetchPubgData(url = "", options = {}, isDataArray = false) {
  const response = await fetch(url, {
    method: "get",
    headers: apiHeaders,
    ...options
  }).then(res => res.json());
  validateResponse(response, isDataArray);
  return response || {};
}

async function getAccountId(_, args = {}) {
  validateArgs(args, ["username"]);
  validateApiKey();

  const { username = "" } = args;
  const url = `${baseUrl}players?filter[playerNames]=${username}`;
  const { data = [] } = await fetchPubgData(url, {}, true);
  const player = data[0] || {};

  return player.id || "";
}

async function getLifetimeStats(_, args) {
  validateArgs(args, ["accountId", "gameMode", "perspective"]);
  validateApiKey();

  const { accountId = "", gameMode = "solo", perspective = "fpp" } = args;
  const url = `${baseUrl}players/${accountId}/seasons/lifetime`;
  const { data = {} } = await fetchPubgData(url);
  const gameModeKey = perspective === "fpp" ? `${gameMode}-fpp` : gameMode;
  const stats = (data.attributes && data.attributes.gameModeStats) || {};

  return stats[gameModeKey] || {};
}

async function getSeasons(...args) {
  validateApiKey();

  const url = `${baseUrl}seasons`;
  const { data = [] } = await fetchPubgData(url, {}, true);

  return data.map(({ id, attributes = {} } = {}) => ({
    id,
    isCurrentSeason: attributes.isCurrentSeason || false,
    isOffSeason: attributes.isOffSeason || false
  }));
}

async function getCurrentSeason(...args) {
  const seasons = (await getSeasons(...args)) || [];

  return seasons.find(season => !!season.isCurrentSeason);
}

async function getSeasonStats(_, args) {
  validateArgs(args, ["accountId", "gameMode", "perspective", "seasonId"]);
  validateApiKey();

  const {
    accountId = "",
    gameMode = "solo",
    perspective = "fpp",
    seasonId
  } = args;
  const url = `${baseUrl}players/${accountId}/seasons/${seasonId}`;
  const { data = {} } = await fetchPubgData(url);
  const gameModeKey = perspective === "fpp" ? `${gameMode}-fpp` : gameMode;
  const stats = (data.attributes && data.attributes.gameModeStats) || {};

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

app.get("/", (_, res) => {
  res.redirect("/graphql");
});

server.applyMiddleware({ app });

module.exports = app;
