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
    getSeasonMatchIds(
      accountId: ID!
      seasonId: ID!
      gameMode: GameMode = solo
      perspective: Perspective = fpp
    ): [ID!]!
    getPlayerMatchIds(accountId: ID!): [ID!]!
    getMatchStats(matchId: ID!): MatchStats!
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

  type MatchStats {
    id: ID!
    meta: MatchMeta
    teams: [MatchRoster]!
    players: [PlayerMatchStats]!
  }

  type MatchMeta {
    createdAt: String
    duration: Float
    gameMode: String
    mapName: String
    isCustomMatch: Boolean
    seasonState: String
  }

  type MatchRoster {
    id: ID
    rank: Int
    teamId: ID
    won: Boolean
    playerIds: [ID]!
  }

  type PlayerMatchStats {
    id: ID
    DBNOs: Int
    asssits: Int
    boosts: Int
    damageDealt: Float
    deathType: String
    headshotKills: Int
    heals: Int
    killPlace: Int
    killStreaks: Int
    kills: Int
    longestKill: Float
    name: String
    playerId: ID
    revives: Int
    rideDistance: Float
    roadKills: Int
    swimDistance: Float
    teamKills: Int
    timeSurvived: Float
    vehicleDestroys: Int
    walkDistance: Float
    weaponsAcuired: Int
    winPlace: Int
    winPoints: Float
    winPointsDelta: Float
  }
`;

const resolvers = {
  Query: {
    getAccountId,
    getLifetimeStats,
    getSeasons,
    getCurrentSeason,
    getSeasonStats,
    getSeasonMatchIds,
    getPlayerMatchIds,
    getMatchStats
  }
};

const baseUrl = "https://api.pubg.com/shards/steam";
const apiHeaders = {
  accept: "application/vnd.api+json",
  Authorization: `Bearer ${process.env.PUBG_API_KEY}`
};

// HELPERS
async function fetchPubgData(url = "", options = {}, isDataArray = false) {
  const response = await fetch(`${baseUrl}${url}`, {
    method: "get",
    headers: apiHeaders,
    ...options
  }).then(res => res.json());
  validateResponse(response, isDataArray);
  return response || {};
}

async function fetchSeasonData({ accountId = "", seasonId = "" } = {}) {
  const url = `/players/${accountId}/seasons/${seasonId}`;
  const { data = {} } = await fetchPubgData(url);
  return data || {};
}

function getGameModeKey({ gameMode = "solo", perspective = "fpp" } = {}) {
  return perspective === "fpp" ? `${gameMode}-fpp` : gameMode;
}

function capitalize(str = "") {
  return `${str.slice(0, 1).toUpperCase()}${str.slice(1)}`;
}

function getMatchesKey({ gameMode = "solo", perspective = "fpp" } = {}) {
  return `matches${capitalize(gameMode)}${perspective === "fpp" ? "FPP" : ""}`;
}

// RESOLVERS
async function getAccountId(_, args = {}) {
  validateArgs(args, ["username"]);
  validateApiKey();

  const { username = "" } = args;
  const url = `/players?filter[playerNames]=${username}`;
  const { data = [] } = await fetchPubgData(url, {}, true);
  const player = data[0] || {};

  return player.id || "";
}

async function getLifetimeStats(_, args) {
  validateArgs(args, ["accountId", "gameMode", "perspective"]);
  validateApiKey();

  const { accountId = "", gameMode = "solo", perspective = "fpp" } = args;
  const url = `/players/${accountId}/seasons/lifetime`;
  const { data = {} } = await fetchPubgData(url);
  const gameModeKey = perspective === "fpp" ? `${gameMode}-fpp` : gameMode;
  const stats = (data.attributes && data.attributes.gameModeStats) || {};

  return stats[gameModeKey] || {};
}

async function getSeasons(...args) {
  validateApiKey();

  const url = `/seasons`;
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

  const data = await fetchSeasonData(args);
  const stats = (data.attributes && data.attributes.gameModeStats) || {};
  const gameModeKey = getGameModeKey(args);

  return stats[gameModeKey] || {};
}

async function getSeasonMatchIds(_, args) {
  validateArgs(args, ["accountId", "gameMode", "perspective", "seasonId"]);
  validateApiKey();

  const data = await fetchSeasonData(args);
  const { relationships = {} } = data;
  const matchesKey = getMatchesKey(args);
  const { data: matches = [] } = relationships[matchesKey] || {};

  return matches.map(match => match.id);
}

async function getPlayerMatchIds(_, args) {
  validateArgs(args, ["accountId"]);
  validateApiKey();

  const { accountId = "" } = args;
  const url = `/players/${accountId}`;
  const { data = {} } = await fetchPubgData(url);
  const { matches: { data: matches } = { matches: { data: [] } } } =
    data.relationships || {};

  return matches.map(match => match.id);
}

async function getMatchStats(_, args) {
  validateArgs(args, ["matchId"]);
  validateApiKey();

  const { matchId = "" } = args;
  const url = `/matches/${matchId}`;
  const { data = {}, included = [] } = await fetchPubgData(url);

  const matchMeta = data.attributes || {};
  const rosterData = included.filter((item = {}) => item.type === "roster");
  const participantData = included.filter(
    (item = {}) => item.type === "participant"
  );

  const players = participantData.map(p => ({
    id: p.id,
    ...((p.attributes && p.attributes.stats) || {})
  }));

  const teams = rosterData.map(r => {
    const { stats = {}, won = false } = r.attributes || {};
    const { participants = {} } = r.relationships;
    const playerIds = (participants.data || []).map(p => p.id);

    return {
      id: r.id,
      ...stats,
      won: won == "true",
      playerIds
    };
  });

  return {
    id: data.id,
    meta: matchMeta,
    teams,
    players
  };
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
