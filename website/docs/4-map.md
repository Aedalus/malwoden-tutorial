---
sidebar_position: 4
---

# 4 - Map

Now we've got a basic player we're able to move around, but there's not much for him to do. Let's start by making a map he can walk around. We'll start by making a new `src/game-map.ts` file. Inside we'll import the `Struct` package, which has a handy `Table` data structure. A `Table` represents a grid of items, with a set width and height. We can use it to record if, say, the position (1,1) contains a wall or floor. We'll also create a new `TileType` enum which will represent the different types of tile a map can have.

```ts
// src/game-map.ts
import { Struct } from "malwoden";

export enum TileType {
  Floor = 1, // Start counting at 1, not 0 so all tiles are 'truthy'
  Wall,
}

export class GameMap{
    tiles: Struct.Table<TileType> // We're using generics, so the <TileType> lets us know what's in the table
    width: number
    height: number

    constructor(tiles: Struct.Table<TileType>, width: number, height: number){
        this.tiles = tiles
        this.width = width
        this.height = height
    }
}

```

Now an empty map isn't going to be much fun, so let's add in a way to generate a more interesting map. We'll make this a static method on the Map class for now, which will return a map. Our first try will be something basic, and we'll focus on some more interesting map generation in future chapters.

```ts
// src/game-map.ts
import { Struct, Rand } from "malwoden"; // Import Rand as well

//..

export class GameMap {
  //..

  static CreateRandom(width: number, height: number): GameMap {
    const tiles = new Struct.Table<TileType>(width, height); // Make a new table
    const rng = new Rand.AleaRNG(); // Make a new RNG so we can get random numbers easily

    tiles.fill(TileType.floor); // Fill the whole map with floor to start

    // Fill the top and bottom rows with wall
    for (let x = 0; x < width; x++) {
      tiles.set({ x, y: 0 }, TileType.Wall);
      tiles.set({ x, y: height - 1 }, TileType.Wall);
    }
      
    // Fill the left and right columns with wall
    for (let y = 0; y < height; y++) {
      tiles.set({ x: 0, y }, TileType.Wall);
      tiles.set({ x: width - 1, y }, TileType.Wall);
    }

    // Fill 400 random positions with wall
    for (let i = 0; i < 400; i++) {
      const x = rng.nextInt(1, width - 2);
      const y = rng.nextInt(1, height - 2);
      tiles.set({ x, y }, TileType.Wall);
    }

    // Return the generated map
    return new GameMap(tiles, width, height)
  }
}
```

Now we need to create a new map whenever the game starts up. Let's go back to `src/app.ts` and add the following.

```ts
// src/app.ts
import { GameMap } from "./map"

export class Game {
  // ...

  world = new World();
  player: Entity;
  gameState = "INIT"
  map = GameMap.CreateRandom(80, 50)
```

Let's update the render system as well, so we render our new map.

```ts
// src/systems/render.ts
import { Terminal, Color } from "malwoden"; // Import Color from Malwoden
import { TileType } from "../game-map"; // Import the TileTypes as well

// ...

  execute() {
    const { results } = this.queries.renderables;

    this.game.terminal.clear();

    // Declare new glyphs we can re-use outside the loop
    const floorGlyph = new Terminal.Glyph(".", Color.Green);
    const wallGlyph = new Terminal.Glyph("#", Color.Green);

    // Loop over every x,y pair in the map
    for(let x = 0; x < this.game.map.width; x++){
      for(let y = 0; y < this.game.map.height; y++){
        const tile = this.game.map.tiles.get({x,y}) // Get the tile
        if(tile === TileType.Floor){
          this.game.terminal.drawGlyph({x,y}, floorGlyph); // Draw if floor
        } else if (tile === TileType.Wall){
          this.game.terminal.drawGlyph({x,y}, wallGlyph); // Draw if wall
        }
      }
    }

    for (const e of results) {
      const p = e.getComponent(Components.Position)!;
      const r = e.getComponent(Components.Renderable)!;

      this.game.terminal.drawGlyph(p, r.glyph);
    }
    this.game.terminal.render();
  }
```

If you restart the game, you should see something that looks like this.

![Map Too Big](/img/chapter-4/too-big.png)

Now something looks off around the bottom and right edge. It turns out our map is larger than our screen! We'll probably need more room as we go though, so let's just increase our screen size for now.

```ts
// src/app.ts

    return new Terminal.RetroTerminal({
      width: 80, // Change width/height to 80x50 here to match map dimensions
      height: 50,
      imageURL: "/fonts/font_16.png",
      charWidth: 16,
      charHeight: 16,
      mountNode,
    });
```

That's looking better. If we try moving around though, our player is still able to walk through walls. Let's add a quick check to see if the player is blocked.

```ts
// src/app.ts
function tryMoveEntity(e: Entity, delta: Vector2, game: Game) { // Add a 3rd argument for game for now
  const pos = e.getMutableComponent(Components.Position);
  if (!pos) {
    console.warn("tried to move an entity without a position");
    return;
  }

  const destination = { x: pos.x + delta.x, y: pos.y + delta.y } // Calculate the destination
  if(game.map.tiles.get(destination) === TileType.Floor){ // Only move if there is floor there
    pos.x = destination.x
    pos.y = destination.y
  }
}

```

Remember to go back and change where we call `tryMoveEntity` to pass in the Game object as well!

```ts
// src/app.ts
async tick(delta: number, time: number) {
    // Handle Player Input
    if(this.gameState === "PLAYER_TURN") {
      const key = await this.input.waitForKeyDown();
  
      const actions = new Map<number, () => void>();
      actions.set(Input.KeyCode.LeftArrow, () =>
        tryMoveEntity(this.player, { x: -1, y: -0 }, this)
      );
      actions.set(Input.KeyCode.RightArrow, () =>
        tryMoveEntity(this.player, { x: 1, y: -0 }, this)
      );
      actions.set(Input.KeyCode.UpArrow, () =>
        tryMoveEntity(this.player, { x: 0, y: -1 }, this)
      );
      actions.set(Input.KeyCode.DownArrow, () =>
        tryMoveEntity(this.player, { x: 0, y: 1 }, this)
      );
  
      const cmd = actions.get(key);
      if (cmd) {
        cmd();
      }
    }
```

Once we're ready, we should be able to try it out and no longer be able to walk through walls!

![Blocked](/img/chapter-4/blocked.gif)

[You can find the source code for this chapter here.](https://github.com/Aedalus/malwoden-tutorial/tree/main/chapter-4)