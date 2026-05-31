import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { applyRoundResult, createGame, getCurrentEast } from './core/game-engine';
import { defaultPlayerNames, Game, PlayerCount, RoundInput } from './core/game.model';

const storageKey = 'mahjong-companion-game-v1';

type AppScreen = 'start' | 'setup' | 'game' | 'endRound';

@Component({
  selector: 'app-root',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  playerCount = signal<PlayerCount>(4);
  playerNames = signal<string[]>([...defaultPlayerNames]);
  game = signal<Game | null>(loadGame());
  screen = signal<AppScreen>(this.game() ? 'game' : 'start');
  selectedWinnerId = signal<string>('none');
  roundPoints = signal<Partial<Record<string, number>>>({});
  editingPlayerId = signal<string | null>(null);

  currentEast = computed(() => {
    const game = this.game();
    return game ? getCurrentEast(game) : null;
  });

  leaderboard = computed(() => {
    const game = this.game();
    return game ? [...game.players].sort((a, b) => b.points - a.points) : [];
  });

  goToSetup(): void {
    this.screen.set('setup');
  }

  backToStart(): void {
    this.screen.set('start');
  }

  setPlayerCount(playerCount: PlayerCount): void {
    this.playerCount.set(playerCount);
  }

  setPlayerName(index: number, value: string): void {
    this.playerNames.update((names) => {
      const next = [...names];
      next[index] = value;
      return next;
    });
  }

  startGame(): void {
    const game = createGame(this.playerCount(), this.playerNames());
    this.game.set(game);
    this.screen.set('game');
    this.resetRoundInput(game);
    saveGame(game);
  }

  openEndRound(): void {
    const game = this.game();

    if (!game) {
      return;
    }

    this.resetRoundInput(game);
    this.screen.set('endRound');
  }

  closeEndRound(): void {
    this.screen.set('game');
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
    this.game.set(nextGame);
    this.resetRoundInput(nextGame);
    this.screen.set('game');
    saveGame(nextGame);
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
    this.editingPlayerId.set(null);
    localStorage.removeItem(storageKey);
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
