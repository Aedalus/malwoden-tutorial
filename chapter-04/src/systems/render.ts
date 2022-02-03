import { World, System } from "ecsy";
import { Terminal, Color } from "malwoden";
import { Game } from "../app";
import * as Components from "../components";
import { TileType } from "../game-map";

export class RenderSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    renderables: {
      components: [Components.Renderable, Components.Position],
    },
  };

  execute() {
    const { results } = this.queries.renderables;

    this.game.terminal.clear();

    const floorGlyph = new Terminal.Glyph(".", Color.Green);
    const wallGlyph = new Terminal.Glyph("#", Color.Green);
    for (let x = 0; x < this.game.map.width; x++) {
      for (let y = 0; y < this.game.map.height; y++) {
        const tile = this.game.map.tiles.get({ x, y });
        if (tile === TileType.Floor) {
          this.game.terminal.drawGlyph({ x, y }, floorGlyph);
        } else if (tile === TileType.Wall) {
          this.game.terminal.drawGlyph({ x, y }, wallGlyph);
        }
      }
    }

    for (const e of results) {
      const p = e.getComponent(Components.Position)!;
      const r = e.getComponent(Components.Renderable)!;

      this.game.terminal.drawGlyph(p, r.glyph);
    }
    this.game.terminal.render();
  }
}
