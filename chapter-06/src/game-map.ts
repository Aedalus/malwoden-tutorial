import { Struct, Rand } from "malwoden";

export enum TileType {
  Floor = 1,
  Wall,
}

export class GameMap {
  tiles: Struct.Table<TileType>;
  rooms: Struct.Rect[] = [];
  width: number;
  height: number;
  visibleTiles: Struct.Table<boolean>;
  exploredTiles: Struct.Table<boolean>;

  constructor(
    tiles: Struct.Table<TileType>,
    rooms: Struct.Rect[],
    width: number,
    height: number
  ) {
    this.tiles = tiles;
    this.rooms = rooms;
    this.width = width;
    this.height = height;

    this.visibleTiles = new Struct.Table(width, height);
    this.exploredTiles = new Struct.Table(width, height);

    this.visibleTiles.fill(false);
    this.exploredTiles.fill(false);
  }

  static GenMapRoomsAndCorridors(width: number, height: number): GameMap {
    const tiles = new Struct.Table<TileType>(width, height);
    tiles.fill(TileType.Wall); // Make a new table and fill it with wall

    const rooms: Struct.Rect[] = [];
    const map = new GameMap(tiles, rooms, width, height);

    const MAX_ROOMS = 30; // We'll try to generate 30 rooms max
    const MIN_SIZE = 6; // Minimum width/height a room can have
    const MAX_SIZE = 10; // Maximum width/height a room can have

    const rng = new Rand.AleaRNG();

    for (let i = 0; i < MAX_ROOMS; i++) {
      // Try to place 30 rooms
      const w = rng.nextInt(MIN_SIZE, MAX_SIZE); // Generate a random w/h
      const h = rng.nextInt(MIN_SIZE, MAX_SIZE);
      const x = rng.nextInt(1, width - w - 1) - 1; // Find a random possible X position
      const y = rng.nextInt(1, height - h - 1) - 1; // Find a random possible Y position
      const newRoom = new Struct.Rect({ x, y }, { x: x + w, y: y + h });

      // See if that newRoom intersects an existing room
      const intersects = rooms.some((r) => r.intersects(newRoom));

      if (intersects === false) {
        // Only add it if no overlap
        map.applyRoomToMap(newRoom); // Hollow out the room area

        if (rooms.length > 0) {
          // Skip if it's the first room we place
          const newCenter = newRoom.center();
          const prevCenter = rooms[rooms.length - 1].center(); // Get the previous room created to add a tunnel

          if (rng.nextBoolean()) {
            // Help shake up the direction we make the tunnels
            map.applyHorizontalTunnel(prevCenter.x, newCenter.x, prevCenter.y);
            map.applyVerticalTunnel(prevCenter.y, newCenter.y, newCenter.x);
          } else {
            map.applyVerticalTunnel(prevCenter.y, newCenter.y, prevCenter.x);
            map.applyHorizontalTunnel(prevCenter.x, newCenter.x, newCenter.y);
          }
        }

        // Finally add the new room to the map
        rooms.push(newRoom);
      }
    }

    return map;
  }

  // Take a rectangle, make that area floor
  applyRoomToMap(room: Struct.Rect) {
    for (let x = room.v1.x; x <= room.v2.x; x++) {
      for (let y = room.v1.y; y <= room.v2.y; y++) {
        this.tiles.set({ x, y }, TileType.Floor);
      }
    }
  }

  // Make a horizontal line of floor
  applyHorizontalTunnel(x1: number, x2: number, y: number) {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);

    for (let x = startX; x <= endX; x++) {
      this.tiles.set({ x, y }, TileType.Floor);
    }
  }

  // Make a vertical line of floor
  applyVerticalTunnel(y1: number, y2: number, x: number) {
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);

    for (let y = startY; y <= endY; y++) {
      this.tiles.set({ x, y }, TileType.Floor);
    }
  }
}
