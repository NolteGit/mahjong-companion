import { describe, expect, it } from 'vitest';
import { applyRoundResult, createGame } from './game-engine';
import { calculateRoundPointChanges } from './scoring';

describe('scoring', () => {
  it('calculates pairwise scoreline differences when nobody wins mahjong', () => {
    const game = createGame(4, undefined, 0);

    const changes = calculateRoundPointChanges(game, {
      winnerPlayerId: null,
      pointsByPlayerId: {
        'player-1': 10,
        'player-2': 5,
        'player-3': 1,
        'player-4': 10,
      },
    });

    expect(changes).toEqual({
      'player-1': 28,
      'player-2': -11,
      'player-3': -31,
      'player-4': 14,
    });
  });

  it('pays the mahjong winner from every other player and compares non-winners', () => {
    const game = createGame(4, undefined, 0);

    const changes = calculateRoundPointChanges(game, {
      winnerPlayerId: 'player-2',
      pointsByPlayerId: {
        'player-1': 10,
        'player-2': 20,
        'player-3': 5,
        'player-4': 0,
      },
    });

    expect(changes).toEqual({
      'player-1': -10,
      'player-2': 80,
      'player-3': -25,
      'player-4': -45,
    });
  });

  it('doubles all transfers won or lost by east', () => {
    const game = createGame(4, undefined, 0);

    const changes = calculateRoundPointChanges(game, {
      winnerPlayerId: 'player-1',
      pointsByPlayerId: {
        'player-1': 20,
        'player-2': 10,
        'player-3': 5,
        'player-4': 0,
      },
    });

    expect(changes).toEqual({
      'player-1': 120,
      'player-2': -25,
      'player-3': -40,
      'player-4': -55,
    });
  });

  it('applies calculated point changes to player totals', () => {
    const game = createGame(4, undefined, 0);

    const nextGame = applyRoundResult(game, {
      winnerPlayerId: 'player-2',
      pointsByPlayerId: {
        'player-1': 10,
        'player-2': 20,
        'player-3': 5,
        'player-4': 0,
      },
    });

    expect(
      Object.fromEntries(nextGame.players.map((player) => [player.id, player.points])),
    ).toEqual({
      'player-1': -10,
      'player-2': 80,
      'player-3': -25,
      'player-4': -45,
    });
    expect(nextGame.rounds[0].pointChangesByPlayerId).toEqual({
      'player-1': -10,
      'player-2': 80,
      'player-3': -25,
      'player-4': -45,
    });
  });
});
