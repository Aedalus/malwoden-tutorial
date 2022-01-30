import { Component, Types } from "ecsy";
import { Terminal } from "malwoden";

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
