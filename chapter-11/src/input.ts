import { Input } from "malwoden";
import { Game, GameState } from "./app";
import * as Actions from "./actions";
import * as Components from "./components";

export class OverworldContext extends Input.KeyboardContext {
  game: Game;
  constructor(game: Game) {
    super();
    this.game = game;

    this.onAnyUp((keyEvent) => {
      if (game.gameState !== GameState.AWAITING_INPUT) return;

      switch (keyEvent.key) {
        case Input.KeyCode.LeftArrow: {
          Actions.tryMoveEntity(game, game.player, { x: -1, y: 0 });
          game.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.RightArrow: {
          Actions.tryMoveEntity(game, game.player, { x: 1, y: 0 });
          game.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.UpArrow: {
          Actions.tryMoveEntity(game, game.player, { x: 0, y: -1 });
          game.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.DownArrow: {
          Actions.tryMoveEntity(game, game.player, { x: 0, y: 1 });
          game.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.P: {
          Actions.attemptToPickUp(
            game,
            game.player,
            game.player.getComponent(Components.Position)!
          );
          break;
        }
        case Input.KeyCode.I: {
          game.gameState = GameState.INVENTORY;
          game.input.setContext(game.keysInventory);
        }
      }
    });
  }
}

export class InventoryContext extends Input.KeyboardContext {
  game: Game;
  constructor(game: Game) {
    super();
    this.game = game;

    this.onAnyUp((keyEvent) => {
      switch (keyEvent.key) {
        case Input.KeyCode.I:
        case Input.KeyCode.Escape: {
          game.gameState = GameState.AWAITING_INPUT;
          game.input.setContext(game.keysOverworld);
          break;
        }
      }
    });
  }
}
