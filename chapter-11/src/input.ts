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
          this.game.goToInventory();
        }
      }
    });
  }
}

export class InventoryContext extends Input.KeyboardContext {
  private game: Game;
  private selectedIndex = 0;

  constructor(game: Game) {
    super();
    this.game = game;

    this.onAnyUp((keyEvent) => {
      switch (keyEvent.key) {
        case Input.KeyCode.I:
        case Input.KeyCode.Escape: {
          this.game.goToOverworld(true);
          break;
        }
        case Input.KeyCode.DownArrow: {
          this.nextItem();
          break;
        }
        case Input.KeyCode.UpArrow: {
          this.prevItem();
          break;
        }
        case Input.KeyCode.Space: {
          this.selectItem();
          break;
        }
      }
    });
  }

  private getPlayerInventory(): Components.Inventory {
    return this.game.player.getComponent(Components.Inventory)!;
  }

  private nextItem() {
    this.selectedIndex += 1;
    const maxIndex = this.getPlayerInventory().items.length - 1;
    if (this.selectedIndex > maxIndex) {
      this.selectedIndex = 0;
    }
  }

  private prevItem() {
    this.selectedIndex -= 1;
    const maxIndex = this.getPlayerInventory().items.length - 1;
    if (this.selectedIndex < 0) {
      this.selectedIndex = maxIndex;
    }
  }

  private selectItem() {
    const item = this.getPlayerInventory().items[this.getSelectedIndex()];
    Actions.consumeInventoryItem(this.game, this.game.player, item);
    this.game.goToOverworld(false);
  }

  getSelectedIndex(): number {
    const maxIndex = this.getPlayerInventory().items.length - 1;
    if (this.selectedIndex > maxIndex) {
      this.selectedIndex = 0;
    }
    return this.selectedIndex;
  }
}
