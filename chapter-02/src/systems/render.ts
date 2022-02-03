import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

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

    for (const e of results) {
      const p = e.getComponent(Components.Position)!;
      const r = e.getComponent(Components.Renderable)!;

      this.game.terminal.drawGlyph(p, r.glyph);
    }
    this.game.terminal.render();
  }
}
