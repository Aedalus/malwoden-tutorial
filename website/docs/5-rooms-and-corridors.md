---
sidebar_position: 5
---

# 5 - Rooms and Corridors

We've got a basic map going, but let's try to make one that looks a bit more like a dungeon rather than just random walls scattered around. We'll be staying almost entirely in the `src/game-map.ts` file this chapter as we make our generation better.

High level, our first map generation algorithm will look like this:

- Create a new Table filled with wall
- Try to generate a new room somewhere on the map
- If it fits, keep it. If not, forget it

We'll want to start keeping track of these rooms as we make them, so we can place more interesting items inside as well. To start, we'll add a new field to our `GameMap`. Malwoden includes a `Rect` class we can use for our rooms for now.

```ts
// src/game-map.ts

export class GameMap {
    tiles: Struct.Table<TileType>
    rooms: Struct.Rect[] = [] // Start keeping track of rooms
    width: number
    height: number

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
  }
```

We'll also create a small handfull of helper methods on our `GameMap` class to help here shortly. None of these should be too complicated, but will make our next method more concise.

```ts
// src/game-map.ts

export class GameMap {
  // ...

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

```

Now we're going to replace the existing generation with this new function.

```ts
// src/game-map.ts

  static GenMapRoomsAndCorridors(width: number, height: number): GameMap {
    const tiles = new Struct.Table<TileType>(width, height);
    tiles.fill(TileType.Wall); // Make a new table and fill it with wall

    const rooms: Struct.Rect[] = []; 
    const map = new GameMap(tiles, rooms, width, height);

    const MAX_ROOMS = 30; // We'll try to generate 30 rooms max
    const MIN_SIZE = 6; // Minimum width/height a room can have
    const MAX_SIZE = 10; // Maximum width/height a room can have

    const rng = new Rand.AleaRNG();

    for (let i = 0; i < MAX_ROOMS; i++) { // Try to place 30 rooms
      const w = rng.nextInt(MIN_SIZE, MAX_SIZE); // Generate a random w/h
      const h = rng.nextInt(MIN_SIZE, MAX_SIZE);
      const x = rng.nextInt(1, width - w - 1) - 1; // Find a random possible X position
      const y = rng.nextInt(1, height - h - 1) - 1; // Find a random possible Y position
      const newRoom = new Struct.Rect({ x, y }, { x: x + w, y: y + h }); 

      // See if that newRoom intersects an existing room
      const intersects = rooms.some(r => r.intersects(newRoom))

      if (intersects === false) { // Only add it if no overlap
        map.applyRoomToMap(newRoom); // Hollow out the room area

        if (rooms.length > 0) { // Skip if it's the first room we place
          const newCenter = newRoom.center();
          const prevCenter = rooms[rooms.length - 1].center(); // Get the previous room created to add a tunnel

          if (rng.nextBoolean()) { // Help shake up the direction we make the tunnels
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

```

Now back in `app.ts` we need to update the function name to use the new Rooms and Corridors function.

```ts
// src/app.ts
// ...

  map = GameMap.GenMapRoomsAndCorridors(80, 50)
```

However if we try to run the game so far, you might see the player completely trapped outside the rooms.

![Player Trapped](/img/chapter-5/player-blocked.png)

Let's try to update the player creation to make sure they always start in a room. We'll grab the first room in the list, and drop the player right in the center. That way they're guaranteed not to be stuck in the wall.

```ts
// src/app.ts
// ...

  initWorld(): { player: Entity } {
    const startRoom = this.map.rooms[0]

    const player = this.world
      .createEntity()
      .addComponent(Components.Position, startRoom.center())
      .addComponent(Components.Player)
      .addComponent(Components.Renderable, {
        glyph: new Terminal.Glyph("@", Color.Yellow),
      });

    return { player };
  }

```

That's all for this chapter! Later on we'll try to circle back and look at some other nice ways we can generate maps. In the next chapter, we'll start to look at Field of View so we can't see the whole dungeon from the start.


[You can find the source code for this chapter here.](https://github.com/Aedalus/malwoden-tutorial/tree/main/chapter-5)