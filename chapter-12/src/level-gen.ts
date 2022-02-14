import { World, Entity } from "ecsy";
import { GameMap } from "./game-map";
import * as Components from "./components";
import { Rand, Struct, Vector2 } from "malwoden";
import * as Prefabs from "./prefabs";

interface GenerateLevelConfig {
  width: number;
  height: number;
  level: number;
}

interface LevelData {
  map: GameMap;
  playerStart: Vector2;
}

export class LevelGenerator {
  world: World;
  rng = new Rand.AleaRNG();

  constructor(world: World) {
    this.world = world;
  }

  createPlayer(position: Vector2): Entity {
    const player = Prefabs.player(this.world);
    Prefabs.placeEntity(player, position);

    const playerInventory = player.getComponent(Components.Inventory)!;
    for (let i = 0; i < 3; i++) {
      playerInventory.items.push(Prefabs.bandage(this.world));
    }

    return player;
  }

  getRandomRoomPosition(room: Struct.Rect): Vector2 {
    const x = this.rng.nextInt(room.v1.x, room.v2.x + 1);
    const y = this.rng.nextInt(room.v1.y, room.v2.y + 1);
    return { x, y };
  }

  generateBasicLevel({ width, height, level }: GenerateLevelConfig): LevelData {
    const map = GameMap.GenMapRoomsAndCorridors(width, height);

    // First room will be where the player starts
    const playerStart = map.rooms[0].center();

    // Create monsters
    // Skip the first room with the player
    for (let i = 1; i < map.rooms.length; i++) {
      const room = map.rooms[i];

      // 50% of spawning a bandage
      if (this.rng.next() < 0.5) {
        const bandage = Prefabs.bandage(this.world);
        Prefabs.placeEntity(bandage, this.getRandomRoomPosition(room));
      }

      const creatureType = this.rng.nextInt(0, 100);

      if (creatureType < 50) {
        Prefabs.placeEntity(
          Prefabs.zombie(this.world),
          this.getRandomRoomPosition(room)
        );
      } else {
        Prefabs.placeEntity(
          Prefabs.raider(this.world),
          this.getRandomRoomPosition(room)
        );
      }
    }

    // Create stairs, get room that isn't a player room
    // Place Survival Crate on level 2 instead of stairs
    const stairRoomIndex = this.rng.nextInt(1, map.rooms.length);
    const stairRoom = map.rooms[stairRoomIndex];
    if (level === 2) {
      Prefabs.placeEntity(
        Prefabs.survivalCrate(this.world),
        this.getRandomRoomPosition(stairRoom)
      );
    } else {
      Prefabs.placeEntity(
        Prefabs.stairs(this.world),
        this.getRandomRoomPosition(stairRoom)
      );
    }

    return {
      map,
      playerStart,
    };
  }
}
