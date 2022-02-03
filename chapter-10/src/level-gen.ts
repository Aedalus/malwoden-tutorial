import { Entity, World } from "ecsy";
import { GameMap } from "./game-map";
import * as Components from "./components";
import { Color, Glyph, Rand, Terminal, Vector2 } from "malwoden";

interface GenerateLevelConfig {
  world: World;
  width: number;
  height: number;
}

interface LevelData {
  map: GameMap;
  player: Entity;
}

export function generateLevel(config: GenerateLevelConfig): LevelData {
  const { world, width, height } = config;
  const map = GameMap.GenMapRoomsAndCorridors(width, height);

  const startRoom = map.rooms[0];

  const player = world
    .createEntity()
    .addComponent(Components.Position, startRoom.center())
    .addComponent(Components.Player)
    .addComponent(Components.Renderable, {
      glyph: new Terminal.Glyph("@", Color.Yellow),
      zIndex: 10,
    })
    .addComponent(Components.BlocksTile)
    .addComponent(Components.Viewshed, { range: 7 })
    .addComponent(Components.CombatStats, {
      hp: 30,
      maxHp: 30,
      power: 5,
      defense: 2,
    })
    .addComponent(Components.Inventory)
    .addComponent(Components.Name, { name: "Player" });

  const rng = new Rand.AleaRNG();

  // Create monsters
  // Skip the first room with the player
  for (let i = 1; i < map.rooms.length; i++) {
    const room = map.rooms[i];

    // 50% of spawning a potion
    if (rng.next() < 0.5) {
      const randX = rng.nextInt(room.v1.x, room.v2.x + 1);
      const randY = rng.nextInt(room.v1.y, room.v2.y + 1);
      spawnPotion(world, { x: randX, y: randY });
    }

    const e = world
      .createEntity()
      .addComponent(Components.Enemy)
      .addComponent(Components.Position, room.center())
      .addComponent(Components.BlocksTile)
      .addComponent(Components.Viewshed, { range: 5 })
      .addComponent(Components.CombatStats, {
        hp: 10,
        maxHp: 10,
        power: 5,
        defense: 2,
      });

    const creatureType = rng.nextInt(0, 100);
    const zombieGlyph = new Terminal.Glyph("Z", Color.Red);
    const raiderGlyph = new Terminal.Glyph("R", Color.Red);

    if (creatureType < 50) {
      e.addComponent(Components.Renderable, { glyph: zombieGlyph, zIndex: 10 });
      e.addComponent(Components.Name, { name: "Zombie" });
    } else {
      e.addComponent(Components.Renderable, { glyph: raiderGlyph, zIndex: 10 });
      e.addComponent(Components.Name, { name: "Raider" });
    }
  }

  return {
    map,
    player,
  };
}

function spawnPotion(world: World, position: Vector2) {
  world
    .createEntity()
    .addComponent(Components.Item)
    .addComponent(Components.Position, position)
    .addComponent(Components.Name, { name: "Bandage" })
    .addComponent(Components.Renderable, {
      glyph: new Glyph("b", Color.Orange),
    });
}
