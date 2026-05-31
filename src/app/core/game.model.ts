export type PlayerCount = 3 | 4;

export type Wind = 'E' | 'S' | 'W' | 'N';

export type GameStatus = 'playing' | 'finished';

export type Player = {
  id: string;
  name: string;
  points: number;
  wind: Wind;
  hasHeldEast: boolean;
  hasUsedEastRepeat: boolean;
};

export type Game = {
  playerCount: PlayerCount;
  roundNumber: number;
  minRounds: number;
  maxRounds: number;
  players: Player[];
  rounds: RoundResult[];
  status: GameStatus;
};

export type RoundInput = {
  winnerPlayerId: string | null;
  pointsByPlayerId: Record<string, number>;
};

export type RoundResult = RoundInput & {
  roundNumber: number;
  eastPlayerId: string;
  windRotated: boolean;
};

export const defaultPlayerNames = [
  'Sun Tzu',
  'Napoleon',
  'Genghis Khan',
  'Hannibal',
] as const;

export const windsByPlayerCount: Record<PlayerCount, Wind[]> = {
  3: ['E', 'S', 'N'],
  4: ['E', 'S', 'W', 'N'],
};