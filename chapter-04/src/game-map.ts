import { Struct, Rand } from "malwoden";

export enum TileType {
  Floor = 1,
  Wall,
}

export class GameMap {
  tiles: Struct.Table<TileType>;
  width: number;
  height: number;

  constructor(tiles: Struct.Table<TileType>, width: number, height: number) {
    this.tiles = tiles;
    this.width = width;
    this.height = height;
  }

  static CreateRandom(width: number, height: number): GameMap {
    const tiles = new Struct.Table<TileType>(width, height);
    const rng = new Rand.AleaRNG();

    tiles.fill(TileType.Floor);

    for (let x = 0; x < width; x++) {
      tiles.set({ x, y: 0 }, TileType.Wall);
      tiles.set({ x, y: height - 1 }, TileType.Wall);
    }

    for (let y = 0; y < height; y++) {
      tiles.set({ x: 0, y }, TileType.Wall);
      tiles.set({ x: width - 1, y }, TileType.Wall);
    }

    for (let i = 0; i < 400; i++) {
      const x = rng.nextInt(1, width - 2);
      const y = rng.nextInt(1, height - 2);
      tiles.set({ x, y }, TileType.Wall);
    }

    return new GameMap(tiles, width, height);
  }
}
