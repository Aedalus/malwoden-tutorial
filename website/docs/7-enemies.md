---
sidebar_position: 7
---

# 7 - Enemies

We now have a player and a dungeon, but don't have any enemies to fight. Let's see how we can use the ECS system to quickly make some enemies in our dungeon. We'll start in `src/app.ts`, near where we create the player.

```ts
// src/app.ts
//...

  initWorld(): { player: Entity } {
    const startRoom = this.map.rooms[0];

    const player = this.world
      .createEntity()
      .addComponent(Components.Position, startRoom.center())
      .addComponent(Components.Player)
      .addComponent(Components.Renderable, {
        glyph: new Terminal.Glyph("@", Color.Yellow),
      })
      .addComponent(Components.Viewshed, { range: 7 });

    // Create monsters
    // Skip the first room with the player
    for (let i = 1; i < this.map.rooms.length; i++) {
      const room = this.map.rooms[i];

      this.world
        .createEntity()
        .addComponent(Components.Position, room.center())
        .addComponent(Components.Renderable, {
          glyph: new Terminal.Glyph("e", Color.Red),
        })
        .addComponent(Components.Viewshed, { range: 5 });
    }
```

If we try to run the game though, we see something weird. Our render system is still drawing entities, even outside the player's view.

![pre render fix](/img/chapter-7/pre-render-fix.png)

Let's go ahead and fix that in the render system.

```ts
// src/systems/render.ts
//...

    for (const e of results) {
      const p = e.getComponent(Components.Position)!;
      const r = e.getComponent(Components.Renderable)!;

      // If not in range, skip
      if (this.game.map.visibleTiles.get(p) === false) continue;

      this.game.terminal.drawGlyph(p, r.glyph);
    }
```

![render fix](/img/chapter-7/render-fix.png)

## Adding More Monster Types

Let's go ahead and make a few different types of enemies. This is really where we can start to add a little bit of flavor to our world, so it's probably time to decide on a theme. For this tutorial, let's try for a post-apocalyptic world. Let's have our first two enemies be a Zombie and Raider.

```ts
// src/app.ts
import { Terminal, Color, Input, Vector2, Rand } from "malwoden"; // Add Rand to the import list

//...

  initWorld(): { player: Entity } {

    // ...

    const rng = new Rand.AleaRNG();

    // Create monsters
    // Skip the first room with the player
    for (let i = 1; i < this.map.rooms.length; i++) {
      const room = this.map.rooms[i];

      const creatureType = rng.nextInt(0, 100);

      // Choose a Zombie or Raider
      const glyph = creatureType < 50
          ? new Terminal.Glyph("Z", Color.Red)
          : new Terminal.Glyph("R", Color.Red);

      this.world
        .createEntity()
        .addComponent(Components.Position, room.center())
        .addComponent(Components.Renderable, { glyph })
        .addComponent(Components.Viewshed, { range: 5 });
    }
```

![zombie raider](/img/chapter-7/zombie-raider.png)


Now we have the monsters, but they don't do much. Let's start to pave the way for them to move around a bit more. We already have a `Player` component to designate the player entity, let's start by making a `Enemy` component that we can add to each enemy.

```ts
// src/components.ts
//...

export class Player extends Component<Player> {}

export class Enemy extends Component<Enemy> {}
```

```ts
// src/components.ts
//...

      this.world
        .createEntity()
        .addComponent(Components.Enemy) // Make sure to add it to the enemy spawning!
        .addComponent(Components.Position, room.center())
        .addComponent(Components.Renderable, { glyph })
        .addComponent(Components.Viewshed, { range: 5 });
```

Now let's make a new `EnemyAI` system that we can start to use to make the enemies think.

```ts
// src/systems/enemy-ai.ts
import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

export class EnemyAISystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    enemies: {
      components: [Components.Enemy, Components.Position],
    },
  };

  execute() {
    const { results } = this.queries.enemies;

    for (const e of results) {
      console.log(e.id + " is thinking!");
    }
  }
}
```

```ts
// src/systems/index.ts

// Remember to export it from index.ts
export { RenderSystem } from "./render";
export { VisibilitySystem } from "./visibility";
export { EnemyAISystem } from "./enemy-ai";
```

We also want to register the new system with ECSY. For now, let's add this after the visibility system. Down the line, we'd want to re-calculate what an enemy can see before it decides what to do!

```ts
// src/app.ts

  registerComponents() {
    this.world
      .registerComponent(Components.Position)
      .registerComponent(Components.Renderable)
      .registerComponent(Components.Player)
      .registerComponent(Components.Enemy)
      .registerComponent(Components.Viewshed)
      .registerSystem(Systems.VisibilitySystem, this)
      .registerSystem(Systems.EnemyAISystem, this) // register the AI System
      .registerSystem(Systems.RenderSystem, this);
  }
```

Now let's add some code to have the monsters chase the player when they see them. To start we'll add a quick helper method to our `Viewshed` component. It's not wise to have any logic on components, but getter/setter type methods can still help.

```ts
// src/components.ts
//...

export class Viewshed extends Component<Viewshed> {
  visibleTiles: Vector2[] = [];
  range = 0;
  dirty = true;

  static schema = {
    visibleTiles: { type: Types.Array },
    range: { type: Types.Number },
    dirty: { type: Types.Boolean },
  };

  containsTile(tile: Vector2): boolean {
    for (const v of this.visibleTiles) {
      if (v.x === tile.x && v.y === tile.y) {
        return true;
      }
    }

    return false;
  }
}
```

Then let's update the enemy-ai system to notice when a player is within an enemy's viewshed.

```ts
// src/examples/enemy-ai.ts
import { Pathfinding } from "malwoden"; // Import pathfinding
import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";
import { TileType } from "../game-map"; // Import TileType

export class EnemyAISystem extends System {
  game: Game;
  pathfinding: Pathfinding.Dijkstra; // We'll keep a pathfinding object around

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;

    // Create a new instance of Dijkstra based pathfinding
    // For now, a tile is blocked if it is a wall
    this.pathfinding = new Pathfinding.Dijkstra({
      topology: "four",
      isBlockedCallback: (v) => this.game.map.tiles.get(v) === TileType.Wall,
    });
  }

  // Update the enemies query
  static queries = {
    enemies: {
      components: [Components.Enemy, Components.Position, Components.Viewshed],
    },
  };

  execute() {
    const { results } = this.queries.enemies;
    const player = this.game.player;
    const playerPos = player.getComponent(Components.Position)!;

    // Loop through each enemy
    for (const e of results) {
      const vs = e.getMutableComponent(Components.Viewshed)!;
      const pos = e.getMutableComponent(Components.Position)!;

      // If the player is in range
      if (vs.containsTile(playerPos)) {
        // Find the path, or undefined if no path
        const path = this.pathfinding.compute(pos, playerPos);

        // [0] will be the enemy's current position, [1] it's next step
        if (path && path[1]) {
          const nextStep = path[1];
          if (!(nextStep.x === playerPos.x && nextStep.y === playerPos.y)) {
            pos.x = nextStep.x;
            pos.y = nextStep.y;
            vs.dirty = true;
          }
        }
      }
    }
  }
}
```

Now if we run the above and move near an enemy, it will start to move towards us.

![monster chasing](/img/chapter-7/monster-chasing.gif)

Now if you play around with this for a bit, you might notice there are still a few issues. The player can move through enemies, and the enemies can also occasionally step on to the same tiles as other enemies. We need some way to tell if a tile is 'blocked' or not, which includes entities as well as tiles. We'll do this by creating a new `BlocksTile` component, as well as start to store whether tiles are blocked or not on our map, similar to how we do visitedTiles.

```ts
// src/components.ts
//...

export class BlocksTile extends Component<BlocksTile> {}
```

```ts
// src/app.ts

  // Remember to register it!
  this.world
    .registerComponent(Components.Position)
    .registerComponent(Components.Renderable)
    .registerComponent(Components.Player)
    .registerComponent(Components.Enemy)
    .registerComponent(Components.Viewshed)
    .registerComponent(Components.BlocksTile)
    .registerSystem(Systems.VisibilitySystem, this)
    .registerSystem(Systems.EnemyAISystem, this)
    .registerSystem(Systems.RenderSystem, this);

  // ...
  // Then add it to the player
  const player = this.world
    .createEntity()
    .addComponent(Components.Position, startRoom.center())
    .addComponent(Components.Player)
    .addComponent(Components.Renderable, {
      glyph: new Terminal.Glyph("@", Color.Yellow),
    })
    .addComponent(Components.BlocksTile)
    .addComponent(Components.Viewshed, { range: 7 });
  
  // ...
  // And then the monsters!
  this.world
    .createEntity()
    .addComponent(Components.Enemy)
    .addComponent(Components.Position, room.center())
    .addComponent(Components.Renderable, { glyph })
    .addComponent(Components.BlocksTile)
    .addComponent(Components.Viewshed, { range: 5 });

```

Then in the map file, let's make a new table that tracks if a position is blocked or not. We'll just recalculate this on every tick for now.

```ts
// src/game-map.ts
//...

export class GameMap {
  tiles: Struct.Table<TileType>;
  rooms: Struct.Rect[] = [];
  width: number;
  height: number;
  visibleTiles: Struct.Table<boolean>;
  exploredTiles: Struct.Table<boolean>;
  blockedTiles: Struct.Table<boolean>; // New Blocked Tiles Table

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
    this.blockedTiles = new Struct.Table(width, height); // Create it here

    this.visibleTiles.fill(false);
    this.exploredTiles.fill(false);
    this.blockedTiles.fill(false); // Let's just be consistent
  }

  // ...
  // We'll make a few helper methods as well beneath the map generation method
  populateBlocked() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const tile = this.tiles.get({ x, y });
        if (tile === TileType.Wall) {
          this.blockedTiles.set({ x, y }, true);
        } else {
          this.blockedTiles.set({ x, y }, false);
        }
      }
    }
  }

  setBlocked(tile: Vector2, value = true) {
    this.blockedTiles.set(tile, value);
  }

  isBlocked(tile: Vector2): boolean {
    return !!this.blockedTiles.get(tile);
  }
```

Now we need some way to populate the blocked list every tick. This seems like a job for a new system

```ts
// src/systems/map-indexing.ts
// Remember to add an export to src/systems/index.ts!
import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

export class MapIndexing extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    blockers: {
      components: [Components.Position, Components.BlocksTile],
    },
  };

  execute() {
    const { results } = this.queries.blockers;

    this.game.map.populateBlocked();
    for (const e of results) {
      const pos = e.getComponent(Components.Position)!;
      this.game.map.setBlocked(pos);
    }
  }
}

```

Also make sure to register it with ECSY. Because this will determine how the entities can move, we'll want this to be registered early so it runs first.

```ts
// src/app.ts
//...

    this.world
      .registerComponent(Components.Position)
      .registerComponent(Components.Renderable)
      .registerComponent(Components.Player)
      .registerComponent(Components.Enemy)
      .registerComponent(Components.Viewshed)
      .registerComponent(Components.BlocksTile)
      .registerSystem(Systems.MapIndexing, this) // let's run this first
      .registerSystem(Systems.VisibilitySystem, this)
      .registerSystem(Systems.EnemyAISystem, this)
      .registerSystem(Systems.RenderSystem, this);
```

Then let's update the two places we have movement logic for now. We have a `tryMoveEntity` function in app.ts, let's move that into a temporary `actions.ts` file for now. We'll likely refactor it later as we find ourselves with more and more actions.

```ts
// src/actions.ts
import { Vector2 } from "malwoden";
import { Entity } from "ecsy";
import { Game } from "./app";
import * as Components from "./components";

// Move this code from app.ts! Remember to add the 'export' at the beginning
// We're going to move the 'game' param to the start though, and an optional param
// for whether the vector is a delta or an absolute position
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

  const destination = absolute // Is the destination relative, or absolute?
    ? position
    : { x: pos.x + position.x, y: pos.y + position.y };

  if (game.map.isBlocked(destination) === false) { // Here we use the new blocked method
    game.map.setBlocked(pos, false); // Update the block index with the new values
    game.map.setBlocked(destination);

    pos.x = destination.x;
    pos.y = destination.y;

    const viewshed = e.getMutableComponent(Components.Viewshed);
    if (viewshed) {
      viewshed.dirty = true;
    }
  }
}

```

```ts
// src/app.ts
// Clean up some imports, import actions as well
import { Terminal, Color, Input, Rand } from "malwoden";
import { World, Entity } from "ecsy";
import * as Components from "./components";
import * as Systems from "./systems";
import * as Actions from "./actions";
import { GameMap } from "./game-map";

// ...

  // We'll also change the following to avoid some naming collisions
  // and fix the references
  async tick(delta: number, time: number) {
    // Handle Player Input
    if (this.gameState === "PLAYER_TURN") {
      const key = await this.input.waitForKeyDown();

      const actionMap = new Map<number, () => void>();
      actionMap.set(Input.KeyCode.LeftArrow, () =>
        Actions.tryMoveEntity(this, this.player, { x: -1, y: -0 })
      );
      actionMap.set(Input.KeyCode.RightArrow, () =>
        Actions.tryMoveEntity(this, this.player, { x: 1, y: -0 })
      );
      actionMap.set(Input.KeyCode.UpArrow, () =>
        Actions.tryMoveEntity(this, this.player, { x: 0, y: -1 })
      );
      actionMap.set(Input.KeyCode.DownArrow, () =>
        Actions.tryMoveEntity(this, this.player, { x: 0, y: 1 })
      );

      const cmd = actionMap.get(key);
      if (cmd) {
        cmd();
      }
    }
}
```

```ts
// src/systems/enemy-ai.ts
import * as Actions from "../actions"; // Add a new import at the top

// ...

  // Here we change it to use the action
  if (path && path[1]) {
    const nextStep = path[1];
    if (!(nextStep.x === playerPos.x && nextStep.y === playerPos.y)) {
      Actions.tryMoveEntity(this.game, e, nextStep, true);
    }
  }

```

Now the player and enemies are using the same logic to move, which helps keep our code clean. If we run the game, we can see the player move around, and start to bump into the monsters.

![monster blocked](/img/chapter-7/monster-blocked.gif)

This was a long chapter, but we got a lot done. Now we have enemies, some basic AI, and even made our map system better and easier to build on. Out new `BlocksTile` component will come in handy to even make other interactive entities in the future, like trees or doors. In the next chapter we'll start to look at some basic combat.

[You can find the source code for this chapter here.](https://github.com/Aedalus/malwoden-tutorial/tree/main/chapter-07)