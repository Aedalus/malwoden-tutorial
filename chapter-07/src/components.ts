import { Component, Types } from "ecsy";
import { Terminal, Vector2 } from "malwoden";

export class Position extends Component<Position> {
  x = 0;
  y = 0;

  static schema = {
    x: { type: Types.Number },
    y: { type: Types.Number },
  };
}

export class Renderable extends Component<Renderable> {
  glyph!: Terminal.Glyph;

  static schema = {
    glyph: { type: Types.Ref },
  };
}

export class Player extends Component<Player> {}

export class Enemy extends Component<Enemy> {}

export class Viewshed extends Component<Viewshed> {
  visibleTiles: Vector2[] = [];
  range = 0;
  dirty = true;

  static schema = {
    visibleTiles: { type: Types.Array },
    range: { type: Types.Number },
    dirty: { type: Types.Boolean },
  };

  containsTile(tile: Vector2): boolean {
    for (const v of this.visibleTiles) {
      if (v.x === tile.x && v.y === tile.y) {
        return true;
      }
    }

    return false;
  }
}

export class BlocksTile extends Component<BlocksTile> {}
