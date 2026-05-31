import { Game, RoundInput } from './game.model';

export function calculateRoundPointChanges(
  game: Game,
  input: RoundInput,
): Record<string, number> {
  const eastPlayer = game.players.find((player) => player.wind === 'E');

  if (!eastPlayer) {
    throw new Error('No east player found.');
  }

  const pointChangesByPlayerId = Object.fromEntries(
    game.players.map((player) => [player.id, 0]),
  ) as Record<string, number>;

  const transferPoints = (
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
  ): void => {
    if (amount === 0) {
      return;
    }

    const eastMultiplier =
      fromPlayerId === eastPlayer.id || toPlayerId === eastPlayer.id ? 2 : 1;
    const transferAmount = amount * eastMultiplier;

    pointChangesByPlayerId[fromPlayerId] -= transferAmount;
    pointChangesByPlayerId[toPlayerId] += transferAmount;
  };

  const winnerPlayerId = input.winnerPlayerId;
  const comparingPlayers = winnerPlayerId
    ? game.players.filter((player) => player.id !== winnerPlayerId)
    : game.players;

  if (winnerPlayerId) {
    const winnerScoreline = input.pointsByPlayerId[winnerPlayerId] ?? 0;

    for (const player of game.players) {
      if (player.id !== winnerPlayerId) {
        transferPoints(player.id, winnerPlayerId, winnerScoreline);
      }
    }
  }

  for (let index = 0; index < comparingPlayers.length; index += 1) {
    for (
      let nextIndex = index + 1;
      nextIndex < comparingPlayers.length;
      nextIndex += 1
    ) {
      const player = comparingPlayers[index];
      const otherPlayer = comparingPlayers[nextIndex];
      const playerScoreline = input.pointsByPlayerId[player.id] ?? 0;
      const otherPlayerScoreline = input.pointsByPlayerId[otherPlayer.id] ?? 0;
      const difference = playerScoreline - otherPlayerScoreline;

      if (difference > 0) {
        transferPoints(otherPlayer.id, player.id, difference);
      } else if (difference < 0) {
        transferPoints(player.id, otherPlayer.id, Math.abs(difference));
      }
    }
  }

  return pointChangesByPlayerId;
}
