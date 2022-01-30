import { Vector2 } from "malwoden";
import { Entity } from "ecsy";
import { Game } from "./app";
import * as Components from "./components";

export function tryMoveEntity(
  game: Game,
  e: Entity,
  position: Vector2,
  absolute = false
) {
  const pos = e.getMutableComponent(Components.Position);
  if (!pos) {
    console.warn("tried to move an entity without a position");
    return;
  }

  const destination = absolute
    ? position
    : { x: pos.x + position.x, y: pos.y + position.y };

  if (game.map.isBlocked(destination) === false) {
    game.map.setBlocked(pos, false);
    game.map.setBlocked(destination);

    pos.x = destination.x;
    pos.y = destination.y;

    const viewshed = e.getMutableComponent(Components.Viewshed);
    if (viewshed) {
      viewshed.dirty = true;
    }
  }
}
