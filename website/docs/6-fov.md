---
sidebar_position: 6
---

# 6 - FOV

In many roguelikes, it's common to not display parts of the map until a player has explored it. We'll look to add this into our game using Malwoden's FoV (Field of View) module. 

To start, we're going to introduce a new component we'll call a `Viewshed`. A viewshed will store all the tiles an entity can see at a given time. If that entity moves (or the map ever changes!) we'll need to re-calculate the tiles the Viewshed remembers. Let's start by adding the component.

```ts
// src/components.ts
import { Terminal, Vector2 } from "malwoden"; // Add Vector2 to the import

// ...

export class Viewshed extends Component<Viewshed> {
  visibleTiles: Vector2[] = [];
  range = 0;
  dirty = true;

  static schema = {
    visibleTiles: { type: Types.Array },
    range: { type: Types.Number },
    dirty: { type: Types.Boolean },
  };
}
```

For now the component has three main fields. `visibleTiles` will store a list of all tiles the entity can see. `range` will be how far the entity can see. We'll also make a `dirty` flag which we'll use to tell if we need to re-calculate the Viewshed each tick. Remember to also register the component in `app.ts`!

```ts
// src/app.ts
// ...

  registerComponents() {
    this.world
      .registerComponent(Components.Position)
      .registerComponent(Components.Renderable)
      .registerComponent(Components.Player)
      .registerComponent(Components.Viewshed) // Make sure to register the component!
      .registerSystem(Systems.RenderSystem, this);
  }
```

Next we need to make a system that will update the viewshed when needed. Let's make a new file, `src/systems/visibility.ts`, and remember to export it in `src/systems/index.ts`. This should look pretty similar to our existing render system. 

```ts
// src/systems/visibility.ts

import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

export class VisibilitySystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    viewers: { // Get entities with both a viewshed and a position component
      components: [Components.Viewshed, Components.Position],
    },
  };

  execute() {
    // We'll update the viewshed here
  }
}
```

```ts
// src/systems/index.ts
export { RenderSystem } from "./render";
export { VisibilitySystem } from "./visibility"
```

And before we forget, let's register the system with ECSY as well. We'll want to add it before the render method, so the calculation is done before any rendering

```ts
// src/app.ts
// ...

    this.world
      .registerComponent(Components.Position)
      .registerComponent(Components.Renderable)
      .registerComponent(Components.Player)
      .registerComponent(Components.Viewshed)
      .registerSystem(Systems.VisibilitySystem, this) // Make sure this is before render!
      .registerSystem(Systems.RenderSystem, this);
```

Now to calculate the FoV for the viewshed. We'll start by going back to the visibility system, and adding the following.

```ts
import { FOV } from "malwoden"; // Import FoV
import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";
import { TileType } from "../game-map"; // Import TileTypes

export class VisibilitySystem extends System {
  game: Game;
  fov: FOV.PreciseShadowcasting; // We'll save an instance of Precise Shadowcasting for later use

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
    this.fov = new FOV.PreciseShadowcasting({ // Create a new instance of PreciseShadowcasting
      topology: "eight",
      lightPasses: (v) => this.game.map.tiles.get(v) === TileType.Floor,
    });
  }
```

Now the above can be a little bit dense to read through initially. We're creating a new `FOV.PreciseShadowcasting` object from malwoden, and passing in options. We're choosing a topology of eight, which means diagonals are treated as the same 'distance' as orthoginal (left/right/up/down). So if an entity has a vision range of two, it can see two diagonally as well as two to the left. In practice, this means the field of view will be more square-ish than diamond shaped, which I personally prefer.

The `lightPasses` option accepts a callback that takes a `Vector2`. The callback should return true if light can pass through that position. In our case, we check the map's tiles for that position, and then return true if it's a Floor for now.

Now that we have the PreciseShadowcasting object, let's use it in the `execute` method to start updating viewsheds.

```ts
// src/systems/visibility.ts

  execute() {
    // Get the entities from our query
    const { results } = this.queries.viewers;

    for (const e of results) { // loop over each
      const v = e.getMutableComponent(Components.Viewshed)!;
      if (!v.dirty) { // If it isn't dirty, continue to the next entity!
        continue;
      } else { // Otherwise, first thing we do is mark it no longer dirty
        v.dirty = false;
      }

      // Get the position of the entity
      const p = e.getComponent(Components.Position)!;

      // Calculate the FoV using the PreciseShadowcasting.
      // This does all the heavy lifting for us, and returns a struct with
      // information on position, range, and light level.
      const visibility = this.fov.calculateArray(p, v.range);

      // We use map/filter here to first transform a VisibilityStruct [] -> Vector2[]
      // of all the tiles we can see.
      // Then we filter to keep only the ones inside of the map.
      v.visibleTiles = visibility
        .map((x) => x.pos)
        .filter(
          (v) =>
            v.x >= 0 &&
            v.x <= this.game.map.width &&
            v.y >= 0 &&
            v.y <= this.game.map.height
        );
    }
  }
```

Now that we have the system done, it should start to update any entity with a viewshed component. Let's make sure we add a viewshed onto our player to start.

```ts
// src/app.ts

    const player = this.world
      .createEntity()
      .addComponent(Components.Position, startRoom.center())
      .addComponent(Components.Player)
      .addComponent(Components.Renderable, {
        glyph: new Terminal.Glyph("@", Color.Yellow),
      })
      .addComponent(Components.Viewshed, { range: 7 }) // Add this!
```

Now if you build the game, it will likely look just like it did before. Even if we're calculating the viewshed, we're not using it to render yet! Let's change that in the render system.

```ts
// src/systems/render.ts
// ...

execute() {
    const { results } = this.queries.renderables;

    this.game.terminal.clear();

    const floorGlyph = new Terminal.Glyph(".", Color.Green)
    const wallGlyph = new Terminal.Glyph("#", Color.Green)

    const player = this.game.player // Get the player from the game object
    const playerViewshed = player.getComponent(Components.Viewshed) // Get the viewshed from the player
    if(!playerViewshed) throw new Error("Player didn't have a viewshed!")

    // loop through the player viewshed, drawing the tile for each position.
    for(const v of playerViewshed.visibleTiles){
      const tile = this.game.map.tiles.get(v)
      if(tile === TileType.Floor){
        this.game.terminal.drawGlyph(v, floorGlyph)
      } else if (tile === TileType.Wall){
        this.game.terminal.drawGlyph(v, wallGlyph)
      } 
    }

```

If we try to run the game, it looks like it's starting to work! However, if we try to move too far, it looks like we can actually move *outside* out viewshed.

![leave behind viewshed](/img/chapter-6/leave-behind.png)

We need to make sure to set the viewshed as dirty whenever we move, so the visibility system will recalculate it.

```ts
// src/app.ts
// ...

function tryMoveEntity(e: Entity, delta: Vector2, game: Game) {
  const pos = e.getMutableComponent(Components.Position);
  if (!pos) {
    console.warn("tried to move an entity without a position");
    return;
  }

  const destination = { x: pos.x + delta.x, y: pos.y + delta.y }
  if(game.map.tiles.get(destination) === TileType.Floor){
    pos.x = destination.x
    pos.y = destination.y

    // If we're moving, try and get the viewshed
    const viewshed = e.getMutableComponent(Components.Viewshed)
    // If it exists, set it to dirty
    if(viewshed){
      viewshed.dirty = true
    }
  }
}
```

Now if we move around, the viewshed updates properly and follows us!

![viewshed working](/img/chapter-6/viewshed-working.gif)

Let's make one last change before we call this chapter. Right now we see around where the player currently is, but it would be nice to remember what areas you explored already looked like. Let's change it so we start to remember what parts of our map are previously visited.

```ts
// src/game-map.ts
// ...

export class GameMap{
    tiles: Struct.Table<TileType>
    rooms: Struct.Rect[] = []
    width: number
    height: number
    visibleTiles: Struct.Table<boolean> // Will store if a tile is *currently* visible to the player
    exploredTiles: Struct.Table<boolean> // Will store if the tile was previously visible

    constructor(tiles: Struct.Table<TileType>, rooms: Struct.Rect[],  width: number, height: number){
        this.tiles = tiles
        this.rooms = rooms
        this.width = width
        this.height = height

        this.visibleTiles = new Struct.Table(width, height) // Make sure to instantiate the tables
        this.exploredTiles = new Struct.Table(width, height)

        this.visibleTiles.fill(false) // And start with every tile set to false
        this.exploredTiles.fill(false)
    }
```

Then in the visibility system, let's update the map's `visibleTiles` and `exploredTiles` whenever the player's viewshed is updated.

```ts
// src/systems/visibility.ts
// ...

      const visibility = this.fov.calculateArray(p, v.range);
      v.visibleTiles = visibility
        .map((x) => x.pos)
        .filter(
          (v) =>
            v.x >= 0 &&
            v.x <= this.game.map.width &&
            v.y >= 0 &&
            v.y <= this.game.map.height
        );

      if (player) { // If the entity is a player, update the map data
        this.game.map.visibleTiles.fill(false); // Reset visibleTiles each time
        v.visibleTiles.forEach((v) => {
          this.game.map.visibleTiles.set(v, true); // Then set the tiles from the viewshed to true
          this.game.map.exploredTiles.set(v, true);
        });
      }
    }
```

Finally, let's update the render system one last time this chapter.

```ts
 execute() {
    const { results } = this.queries.renderables;

    this.game.terminal.clear();

    const floorGlyph = new Terminal.Glyph(".", Color.Green)
    const wallGlyph = new Terminal.Glyph("#", Color.Green)

    // Add new gray glyphs for what tiles look like if they're explored for now
    const floorGlyphExplored = new Terminal.Glyph(".", Color.Gray)
    const wallGlyphExplored = new Terminal.Glyph("#", Color.Gray)

    // Loop over every x/y of the map
    for(let x = 0; x < this.game.map.width; x++){
      for(let y = 0; y < this.game.map.height; y++){
        const v = {x, y} // create a Vector2 to make thing cleaner

        const explored = this.game.map.exploredTiles.get(v) // Was the tile previously explored?
        const visible = this.game.map.visibleTiles.get(v) // Is it currently seen by the player?
        const tile = this.game.map.tiles.get(v) // What is the tile?

        if(visible){ // If it's visible, draw what we normally do
          if(tile === TileType.Floor){
            this.game.terminal.drawGlyph(v, floorGlyph)
          } else if (tile === TileType.Wall){
            this.game.terminal.drawGlyph(v, wallGlyph)
          } 
        } else if(explored){ // If they're not visible but explored, draw them as gray
          if(tile === TileType.Floor){
            this.game.terminal.drawGlyph(v, floorGlyphExplored)
          } else if (tile === TileType.Wall){
            this.game.terminal.drawGlyph(v, wallGlyphExplored)
          }  
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
}
```

If you followed along, you should now see parts of the map you already explored.

![explored tiles](/img/chapter-6/explored-tiles.gif)

That's all we'll do with FoV for now, but we'll use these same Viewsheds again to make monsters start to chase players later on.

[You can find the source code for this chapter here.](https://github.com/Aedalus/malwoden-tutorial/tree/main/chapter-06)