import { CharCode, Color, Glyph, Terminal, Vector2 } from "malwoden";
import { Entity, World } from "ecsy";
import * as Components from "./components";

export function placeEntity(entity: Entity, position: Vector2) {
  entity.addComponent(Components.Position, position);
}

export function player(world: World): Entity {
  return world
    .createEntity()
    .addComponent(Components.Player)
    .addComponent(Components.Renderable, {
      glyph: new Terminal.Glyph("@", Color.Yellow),
      zIndex: 10,
    })
    .addComponent(Components.BlocksTile)
    .addComponent(Components.Viewshed, { range: 7 })
    .addComponent(Components.CombatStats, {
      hp: 50,
      maxHp: 50,
      power: 5,
      defense: 2,
    })
    .addComponent(Components.Inventory)
    .addComponent(Components.Name, { name: "Player" });
}

export function bandage(world: World): Entity {
  return world
    .createEntity()
    .addComponent(Components.Item)
    .addComponent(Components.Name, { name: "Bandage" })
    .addComponent(Components.Renderable, {
      glyph: new Glyph("b", Color.Orange),
    })
    .addComponent(Components.Consumable, {
      verb: "used",
      healing: 5,
    })
    .addComponent(Components.Description, {
      text: "A bit worn, but will still heal",
    });
}

export function zombie(world: World): Entity {
  return world
    .createEntity()
    .addComponent(Components.Enemy)
    .addComponent(Components.BlocksTile)
    .addComponent(Components.Viewshed, { range: 5, dirty: true })
    .addComponent(Components.CombatStats, {
      hp: 10,
      maxHp: 10,
      power: 5,
      defense: 2,
    })
    .addComponent(Components.Renderable, {
      glyph: new Terminal.Glyph("Z", Color.Red),
      zIndex: 10,
    })
    .addComponent(Components.Name, { name: "Zombie" });
}

export function raider(world: World): Entity {
  return world
    .createEntity()
    .addComponent(Components.Enemy)
    .addComponent(Components.BlocksTile)
    .addComponent(Components.Viewshed, { range: 5, dirty: true })
    .addComponent(Components.CombatStats, {
      hp: 10,
      maxHp: 10,
      power: 5,
      defense: 2,
    })
    .addComponent(Components.Renderable, {
      glyph: new Terminal.Glyph("R", Color.Red),
      zIndex: 10,
    })
    .addComponent(Components.Name, { name: "Raider" });
}

export function stairs(world: World): Entity {
  return world
    .createEntity()
    .addComponent(Components.Renderable, {
      glyph: new Glyph("/", Color.Cyan),
    })
    .addComponent(Components.Name, { name: "Stairs" })
    .addComponent(Components.CanDescend);
}

export function survivalCrate(world: World): Entity {
  return world
    .createEntity()
    .addComponent(Components.Renderable, {
      glyph: new Glyph("=", Color.Yellow), // Yellow '=' is our crate
    })
    .addComponent(Components.Name, { name: "Survival Crate" })
    .addComponent(Components.WinOnPickup);
}
