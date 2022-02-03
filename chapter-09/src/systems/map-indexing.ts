import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

export class MapIndexing extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    entities: {
      components: [Components.Position],
    },
  };

  execute() {
    const { results } = this.queries.entities;

    this.game.map.clearTileContent();
    this.game.map.populateBlocked();
    for (const e of results) {
      const pos = e.getComponent(Components.Position)!;
      const blocker = e.getComponent(Components.BlocksTile);
      this.game.map.addTileContent(pos, e);
      if (blocker) {
        this.game.map.setBlocked(pos);
      }
    }
  }
}
