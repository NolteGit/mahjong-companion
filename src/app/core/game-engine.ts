import {
  defaultPlayerNames,
  Game,
  Player,
  PlayerCount,
  RoundInput,
  windsByPlayerCount,
} from './game.model';
import { calculateRoundPointChanges } from './scoring';

export function createGame(
  playerCount: PlayerCount,
  names: string[] = [...defaultPlayerNames],
  eastIndex = randomIndex(playerCount),
): Game {
  const winds = windsByPlayerCount[playerCount];

  const players = Array.from({ length: playerCount }, (_, index): Player => {
    const wind = winds[(index - eastIndex + playerCount) % playerCount];

    return {
      id: `player-${index + 1}`,
      name: names[index]?.trim() || defaultPlayerNames[index],
      points: 0,
      wind,
      hasHeldEast: wind === 'E',
      hasUsedEastRepeat: false,
    };
  });

  return {
    playerCount,
    roundNumber: 1,
    minRounds: playerCount,
    maxRounds: playerCount * 2,
    players,
    rounds: [],
    status: 'playing',
  };
}

export function applyRoundResult(game: Game, input: RoundInput): Game {
  if (game.status === 'finished') {
    return game;
  }

  const eastPlayer = getCurrentEast(game);
  const pointChangesByPlayerId = calculateRoundPointChanges(game, input);
  const eastWinsFirstTime =
    input.winnerPlayerId === eastPlayer.id && !eastPlayer.hasUsedEastRepeat;

  const playersWithPoints = game.players.map((player) => ({
    ...player,
    points: player.points + pointChangesByPlayerId[player.id],
    hasUsedEastRepeat:
      player.id === eastPlayer.id && eastWinsFirstTime
        ? true
        : player.hasUsedEastRepeat,
  }));

  const playersAfterWindStep = eastWinsFirstTime
    ? playersWithPoints
    : rotateWindsRight(playersWithPoints);

  const nextEast = playersAfterWindStep.find((player) => player.wind === 'E');

  if (!nextEast) {
    throw new Error('No east player found after round result.');
  }

  const isReturningToPreviousEastCycle =
    !eastWinsFirstTime && nextEast.hasHeldEast && game.roundNumber >= game.minRounds;

  const hasReachedMaxRounds = game.roundNumber >= game.maxRounds;
  const shouldFinish = isReturningToPreviousEastCycle || hasReachedMaxRounds;

  const finalPlayers = playersAfterWindStep.map((player) => ({
    ...player,
    hasHeldEast: player.wind === 'E' ? true : player.hasHeldEast,
  }));

  return {
    ...game,
    roundNumber: shouldFinish ? game.roundNumber : game.roundNumber + 1,
    players: finalPlayers,
    rounds: [
      ...game.rounds,
      {
        ...input,
        pointChangesByPlayerId,
        roundNumber: game.roundNumber,
        eastPlayerId: eastPlayer.id,
        windRotated: !eastWinsFirstTime,
      },
    ],
    status: shouldFinish ? 'finished' : 'playing',
  };
}

export function getCurrentEast(game: Game): Player {
  const eastPlayer = game.players.find((player) => player.wind === 'E');

  if (!eastPlayer) {
    throw new Error('No east player found.');
  }

  return eastPlayer;
}

export function rotateWindsRight(players: Player[]): Player[] {
  const winds = players.map((player) => player.wind);

  return players.map((player, index) => ({
    ...player,
    wind: winds[(index - 1 + players.length) % players.length],
  }));
}

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}