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

    const floorGlyphExplored = new Terminal.Glyph(".", Color.Gray);
    const wallGlyphExplored = new Terminal.Glyph("#", Color.Gray);

    for (let x = 0; x < this.game.map.width; x++) {
      for (let y = 0; y < this.game.map.height; y++) {
        const v = { x, y };
        const explored = this.game.map.exploredTiles.get(v);
        const visible = this.game.map.visibleTiles.get(v);
        const tile = this.game.map.tiles.get(v);

        if (visible) {
          if (tile === TileType.Floor) {
            this.game.terminal.drawGlyph(v, floorGlyph);
          } else if (tile === TileType.Wall) {
            this.game.terminal.drawGlyph(v, wallGlyph);
          }
        } else if (explored) {
          if (tile === TileType.Floor) {
            this.game.terminal.drawGlyph(v, floorGlyphExplored);
          } else if (tile === TileType.Wall) {
            this.game.terminal.drawGlyph(v, wallGlyphExplored);
          }
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
