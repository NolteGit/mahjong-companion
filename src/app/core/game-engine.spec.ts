import { describe, expect, it } from 'vitest';
import { applyRoundResult, createGame, getCurrentEast } from './game-engine';

describe('game engine', () => {
  it('creates a 4 player game with one east player', () => {
    const game = createGame(4, undefined, 0);

    expect(game.players).toHaveLength(4);
    expect(game.players.filter((player) => player.wind === 'E')).toHaveLength(1);
    expect(game.minRounds).toBe(4);
    expect(game.maxRounds).toBe(8);
  });

  it('creates a 3 player game without west wind', () => {
    const game = createGame(3, undefined, 0);

    expect(game.players.map((player) => player.wind)).toEqual(['E', 'S', 'N']);
  });

  it('keeps winds when east wins for the first time', () => {
    const game = createGame(4, undefined, 0);
    const eastPlayer = getCurrentEast(game);

    const nextGame = applyRoundResult(game, {
      winnerPlayerId: eastPlayer.id,
      pointsByPlayerId: {},
    });

    expect(getCurrentEast(nextGame).id).toBe(eastPlayer.id);
    expect(getCurrentEast(nextGame).hasUsedEastRepeat).toBe(true);
    expect(nextGame.roundNumber).toBe(2);
    expect(nextGame.rounds[0].windRotated).toBe(false);
  });

  it('rotates winds when east wins for the second time', () => {
    const game = createGame(4, undefined, 0);
    const eastPlayer = getCurrentEast(game);

    const repeatedGame = applyRoundResult(game, {
      winnerPlayerId: eastPlayer.id,
      pointsByPlayerId: {},
    });

    const nextGame = applyRoundResult(repeatedGame, {
      winnerPlayerId: eastPlayer.id,
      pointsByPlayerId: {},
    });

    expect(getCurrentEast(nextGame).id).not.toBe(eastPlayer.id);
    expect(nextGame.rounds[1].windRotated).toBe(true);
  });

  it('finishes after the minimum number of rounds when nobody repeats east', () => {
    let game = createGame(4, undefined, 0);

    while (game.status !== 'finished') {
      game = applyRoundResult(game, {
        winnerPlayerId: null,
        pointsByPlayerId: {},
      });
    }

    expect(game.rounds).toHaveLength(4);
    expect(game.status).toBe('finished');
  });
});