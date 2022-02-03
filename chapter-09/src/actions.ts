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

  for (const other of game.map.getTileContent(destination)) {
    const combatStats = other.getComponent(Components.CombatStats);
    if (combatStats) {
      e.addComponent(Components.AttemptToMelee, { defender: other });
      return; // don't continue to move
    }
  }

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

export function inflictDamage(e: Entity, amount: number) {
  if (!e.hasComponent(Components.IncomingDamage)) {
    e.addComponent(Components.IncomingDamage, { amount });
  } else {
    const incDamage = e.getMutableComponent(Components.IncomingDamage)!;
    incDamage.amount += amount;
  }
}
