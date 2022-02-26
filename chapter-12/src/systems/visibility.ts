import { FOV } from "malwoden";
import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";
import { TileType } from "../game-map";

export class VisibilitySystem extends System {
  game: Game;
  fov: FOV.PreciseShadowcasting;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
    this.fov = new FOV.PreciseShadowcasting({
      topology: "eight",
      lightPasses: (v) => this.game.map.tiles.get(v) === TileType.Floor,
    });
  }

  static queries = {
    viewers: {
      components: [Components.Viewshed, Components.Position],
    },
  };

  execute() {
    const { results } = this.queries.viewers;

    for (const e of results) {
      const v = e.getMutableComponent(Components.Viewshed)!;
      if (!v.dirty) {
        continue;
      } else {
        v.dirty = false;
      }

      const p = e.getComponent(Components.Position)!;
      const player = e.getComponent(Components.Player);

      const visibility = this.fov.calculateArray(p, v.range);
      v.visibleTiles = visibility
        .map((x) => x.pos)
        .filter(
          (v) =>
            v.x >= 0 &&
            v.x <= this.game.map.width &&
            v.y >= 0 &&
            v.y <= this.game.map.height
        );

      if (player) {
        this.game.map.visibleTiles.fill(false);
        v.visibleTiles.forEach((v) => {
          this.game.map.visibleTiles.set(v, true);
          this.game.map.exploredTiles.set(v, true);
        });
      }
    }
  }
}
