import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { applyRoundResult, createGame, getCurrentEast } from './core/game-engine';
import { defaultPlayerNames, Game, PlayerCount, RoundInput } from './core/game.model';

const storageKey = 'mahjong-companion-game-v1';
const undoStorageKey = 'mahjong-companion-undo-v1';

type AppScreen = 'start' | 'setup' | 'game' | 'endRound' | 'roundReview';

@Component({
  selector: 'app-root',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  playerCount = signal<PlayerCount>(4);
  playerNames = signal<string[]>([...defaultPlayerNames]);
  selectedEastIndex = signal<number>(randomIndex(4));
  game = signal<Game | null>(loadGame());
  screen = signal<AppScreen>(this.game() ? 'game' : 'start');
  selectedWinnerId = signal<string>('none');
  roundPoints = signal<Partial<Record<string, number>>>({});
  pendingGame = signal<Game | null>(null);
  undoGame = signal<Game | null>(loadUndoGame());
  editingPlayerId = signal<string | null>(null);

  currentEast = computed(() => {
    const game = this.game();
    return game ? getCurrentEast(game) : null;
  });

  leaderboard = computed(() => {
    const game = this.game();
    return game ? [...game.players].sort((a, b) => b.points - a.points) : [];
  });

  selectedEastName = computed(() =>
    this.playerNames()[this.selectedEastIndex()] ?? `Player ${this.selectedEastIndex() + 1}`,
  );

  canUndo = computed(() => Boolean(this.game() && this.undoGame()));

  roundReviewRows = computed(() => {
    const game = this.game();
    const pendingGame = this.pendingGame();

    if (!game || !pendingGame) {
      return [];
    }

    return game.players.map((player) => {
      const nextPlayer = pendingGame.players.find((candidate) => candidate.id === player.id);
      const nextPoints = nextPlayer?.points ?? player.points;

      return {
        id: player.id,
        name: player.name,
        before: player.points,
        after: nextPoints,
        delta: nextPoints - player.points,
      };
    });
  });

  goToSetup(): void {
    this.screen.set('setup');
  }

  backToStart(): void {
    this.screen.set('start');
  }

  setPlayerCount(playerCount: PlayerCount): void {
    this.playerCount.set(playerCount);

    if (this.selectedEastIndex() >= playerCount) {
      this.selectedEastIndex.set(0);
    }
  }

  setStartingEast(index: number): void {
    this.selectedEastIndex.set(index);
  }

  randomizeStartingEast(): void {
    this.selectedEastIndex.set(randomIndex(this.playerCount()));
  }

  setPlayerName(index: number, value: string): void {
    this.playerNames.update((names) => {
      const next = [...names];
      next[index] = value;
      return next;
    });
  }

  startGame(): void {
    const game = createGame(
      this.playerCount(),
      this.playerNames(),
      this.selectedEastIndex(),
    );
    this.game.set(game);
    this.screen.set('game');
    this.resetRoundInput(game);
    this.clearUndoGame();
    saveGame(game);
  }

  openEndRound(): void {
    const game = this.game();

    if (!game) {
      return;
    }

    this.pendingGame.set(null);
    this.resetRoundInput(game);
    this.screen.set('endRound');
  }

  closeEndRound(): void {
    this.pendingGame.set(null);
    this.screen.set('game');
  }

  backToRoundInput(): void {
    this.pendingGame.set(null);
    this.screen.set('endRound');
  }

  setWinner(value: string): void {
    this.selectedWinnerId.set(value);
  }

  setRoundPoint(playerId: string, value: string | number): void {
    this.roundPoints.update((points) => ({
      ...points,
      [playerId]: Number(value) || 0,
    }));
  }

  submitRound(): void {
    const game = this.game();

    if (!game) {
      return;
    }

    const pointsByPlayerId = Object.fromEntries(
      game.players.map((player) => [
        player.id,
        this.roundPoints()[player.id] ?? 0,
      ]),
    );

    const input: RoundInput = {
      winnerPlayerId: this.selectedWinnerId() === 'none' ? null : this.selectedWinnerId(),
      pointsByPlayerId,
    };

    const nextGame = applyRoundResult(game, input);
    this.pendingGame.set(nextGame);
    this.screen.set('roundReview');
  }

  applyReviewedRound(): void {
    const game = this.game();
    const nextGame = this.pendingGame();

    if (!game || !nextGame) {
      return;
    }

    this.undoGame.set(game);
    saveUndoGame(game);
    this.game.set(nextGame);
    this.pendingGame.set(null);
    this.resetRoundInput(nextGame);
    this.screen.set('game');
    saveGame(nextGame);
  }

  undoLastRound(): void {
    const undoGame = this.undoGame();

    if (!undoGame) {
      return;
    }

    this.game.set(undoGame);
    this.pendingGame.set(null);
    this.resetRoundInput(undoGame);
    this.screen.set('game');
    saveGame(undoGame);
    this.clearUndoGame();
  }

  startEditingPlayerName(playerId: string): void {
    this.editingPlayerId.set(playerId);
  }

  finishEditingPlayerName(): void {
    this.editingPlayerId.set(null);
  }

  updatePlayerName(playerId: string, value: string): void {
    const game = this.game();

    if (!game) {
      return;
    }

    const nextGame: Game = {
      ...game,
      players: game.players.map((player) =>
        player.id === playerId
          ? { ...player, name: value.trim() || player.name }
          : player,
      ),
    };

    this.game.set(nextGame);
    saveGame(nextGame);
  }

  resetGame(): void {
    this.game.set(null);
    this.screen.set('start');
    this.selectedWinnerId.set('none');
    this.roundPoints.set({});
    this.pendingGame.set(null);
    this.editingPlayerId.set(null);
    this.clearUndoGame();
    localStorage.removeItem(storageKey);
  }

  private clearUndoGame(): void {
    this.undoGame.set(null);
    localStorage.removeItem(undoStorageKey);
  }

  private resetRoundInput(game: Game): void {
    this.selectedWinnerId.set('none');
    this.roundPoints.set(
      Object.fromEntries(game.players.map((player) => [player.id, 0])),
    );
  }
}

function loadGame(): Game | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const rawGame = localStorage.getItem(storageKey);

  if (!rawGame) {
    return null;
  }

  try {
    return JSON.parse(rawGame) as Game;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

function saveGame(game: Game): void {
  localStorage.setItem(storageKey, JSON.stringify(game));
}

function loadUndoGame(): Game | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const rawGame = localStorage.getItem(undoStorageKey);

  if (!rawGame) {
    return null;
  }

  try {
    return JSON.parse(rawGame) as Game;
  } catch {
    localStorage.removeItem(undoStorageKey);
    return null;
  }
}

function saveUndoGame(game: Game): void {
  localStorage.setItem(undoStorageKey, JSON.stringify(game));
}

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}
