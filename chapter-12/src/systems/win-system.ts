import { World, System } from "ecsy";
import { Calc } from "malwoden";
import { Game, GameState } from "../app";
import * as Components from "../components";

export class WinSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    winOnPickup: {
      components: [Components.WinOnPickup, Components.Position],
    },
  };

  execute() {
    const { results } = this.queries.winOnPickup;

    const playerPos = this.game.player.getComponent(Components.Position)!;
    for (const e of results) {
      const winPos = e.getComponent(Components.Position)!;

      if (Calc.Vector.areEqual(playerPos, winPos)) {
        this.game.gameState = GameState.WON_GAME;
      }
    }
  }
}
