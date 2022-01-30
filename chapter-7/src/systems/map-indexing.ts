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
    blockers: {
      components: [Components.Position, Components.BlocksTile],
    },
  };

  execute() {
    const { results } = this.queries.blockers;

    this.game.map.populateBlocked();
    for (const e of results) {
      const pos = e.getComponent(Components.Position)!;
      this.game.map.setBlocked(pos);
    }
  }
}
