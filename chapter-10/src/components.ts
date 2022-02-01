import { Component, Entity, Types } from "ecsy";
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
  zIndex = 0;

  static schema = {
    glyph: { type: Types.Ref },
    zIndex: { type: Types.Number },
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

export class CombatStats extends Component<CombatStats> {
  hp = 10;
  maxHp = 10;
  defense = 0;
  power = 1;

  static schema = {
    hp: { type: Types.Number },
    maxHp: { type: Types.Number },
    defense: { type: Types.Number },
    power: { type: Types.Number },
  };
}

export class AttemptToMelee extends Component<AttemptToMelee> {
  defender!: Entity;

  static schema = {
    defender: { type: Types.Ref },
  };
}

export class IncomingDamage extends Component<IncomingDamage> {
  amount = 0;

  static schema = {
    amount: { type: Types.Number },
  };
}

export class Name extends Component<Name> {
  name = "UNKNOWN";

  static schema = {
    name: { type: Types.String },
  };
}

export class Item extends Component<Item> {}

export class AttemptToPickupItem extends Component<AttemptToPickupItem> {
  entity!: Entity;
  item!: Entity;

  static schema = {
    entity: { type: Types.Ref },
    item: { type: Types.Ref },
  };
}

export class Inventory extends Component<Inventory> {
  items!: Entity[];

  static schema = {
    owner: { type: Types.Ref },
  };
}
