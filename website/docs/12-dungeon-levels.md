---
sidebar_position: 10
---

# 12 - Dungeon Levels

We're getting to the point that the player can move around, fight, and even use items. However so far they're still constrained to a single level! In this chapter we're going to look at cleaning up our level generation logic, as well as make the player go down stairs. Fair warning, this might not be as simple with an ECS system than it otherwise would be!

## Cleaning Up Our Level Generation With Prefabs

Our level generation is working pretty well so far, but we've also got a number of responsibilities all handled in the same function:

- Generating the Map
- Generating the Player
- Generating Items
- Generating Enemies

What's more, is we also define what our `Player`, `Raider`, and `Zombie` entities are in the function, not just place them in the level! We'd previously moved creating `Bandages` into it's own function as we saw how that helped reuse the code when we were adding bandages to the player's inventory as well as the world.

What if we used this same approach for *all* our entities? Have a single function for each type that knows how to create and return that specific type. If we need to change or add components after, we can always do that as well!

Let's create a new file called `prefabs.ts`. In here we can move all of our current code around generating entities.

```ts
// src/prefabs.ts
import { Color, Glyph, Terminal, Vector2 } from "malwoden";
import { Entity, World } from "ecsy";
import * as Components from "./components";

// not a prefab itself, but helps us place them!
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
      hp: 30,
      maxHp: 30,
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
```

We've also got to clean up our `level-gen.ts` file now. We're going to make it a bit more object oriented by defining a `LevelGenerator`. Inside we'll keep most of the existing logic inside a `generateBasicLevel()` method. We are going to make an important change though. We'll only have the level return the intended Player *position*, rather than the entire player entity. Then we'll have a second method that can generate a player based on a given position. This will make it easy to generate new levels, without generating new players!

```ts
// level-gen.ts
import { World, Entity } from "ecsy";
import { GameMap } from "./game-map";
import * as Components from "./components";
import { Rand, Vector2 } from "malwoden";
import * as Prefabs from "./prefabs";

interface GenerateLevelConfig {
  width: number;
  height: number;
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

  generateBasicLevel({ width, height }: GenerateLevelConfig): LevelData {
    const map = GameMap.GenMapRoomsAndCorridors(width, height);

    // First room will be where the player starts
    const playerStart = map.rooms[0].center();

    // Create monsters
    // Skip the first room with the player
    for (let i = 1; i < map.rooms.length; i++) {
      const room = map.rooms[i];

      // 50% of spawning a bandage
      if (this.rng.next() < 0.5) {
        const randX = this.rng.nextInt(room.v1.x, room.v2.x + 1);
        const randY = this.rng.nextInt(room.v1.y, room.v2.y + 1);
        const bandage = Prefabs.bandage(this.world);
        Prefabs.placeEntity(bandage, { x: randX, y: randY });
      }

      const creatureType = this.rng.nextInt(0, 100);

      if (creatureType < 50) {
        Prefabs.placeEntity(Prefabs.zombie(this.world), room.center());
      } else {
        Prefabs.placeEntity(Prefabs.raider(this.world), room.center());
      }
    }

    return {
      map,
      playerStart,
    };
  }
}
```

Now we'll update our `app.ts` to use the new format.

```ts
// src/app.ts
// make sure to update imports as well!
// ...
export class Game {
  input = new Input.KeyboardHandler();
  mouse = new Input.MouseHandler();
  terminal = this.createTerminal();
  lastTime = performance.now();
  world = new World();
  player: Entity;
  gameState = GameState.INIT;
  map: GameMap;
  log = new GameLog();
  levelGen = new LevelGenerator(this.world);

  keysOverworld = new OverworldContext(this);
  keysInventory = new InventoryContext(this);

  constructor() {
    this.registerComponents();
    const level = this.levelGen.generateBasicLevel({
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    });
    const player = this.levelGen.createPlayer(level.playerStart);
    this.player = player;
    this.map = level.map;

    this.input.setContext(this.keysOverworld);
    this.log.addMessage("Game Start!");
  }


```

## Creating Stairs

Stairs will be another kind of entity for us. Let's add a new component to let a player know when they can descend when standing on stairs.


```ts
// src/components.ts
//...

// make sure to register in app.ts!
export class CanDescend extends Component<CanDescend> {}
```

Now we're starting to create all our entities in `prefab.ts`, so let's add a new function there where we can create some stairs. We'll use a blue `/` for now to show them.

```ts
// src/prefabs.ts
//...
export function stairs(world: World): Entity {
  return world
    .createEntity()
    .addComponent(Components.Renderable, {
      glyph: new Glyph("/", Color.Cyan),
    })
    .addComponent(Components.Name, { name: "Stairs" })
    .addComponent(Components.CanDescend);
}
```

Finally, let's add a the stairs to our level generation. We're starting to duplicate some code for choosing a random spot in a room, so we'll move that code to it's own method.

```ts
// src/level-gen.ts
//...

  getRandomRoomPosition(room: Struct.Rect): Vector2 {
    const x = this.rng.nextInt(room.v1.x, room.v2.x + 1);
    const y = this.rng.nextInt(room.v1.y, room.v2.y + 1);
    return { x, y };
  }

   generateBasicLevel({ width, height }: GenerateLevelConfig): LevelData {
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
    const stairRoomIndex = this.rng.nextInt(1, map.rooms.length);
    const stairRoom = map.rooms[stairRoomIndex];
    Prefabs.placeEntity(
      Prefabs.stairs(this.world),
      this.getRandomRoomPosition(stairRoom)
    );

    return {
      map,
      playerStart,
    };
  }
```

> :warning: **Bugfix**: While trying to run this example, I realized we can't hover over either stairs or bandages to see the name! This is due to how we're calculating which entity is on top. Let's fix it real quick!

```ts
// src/systems/render.ts
//...
    let labelName = "";
    let highestZIndex = -Infinity; // Used to be 0

    for (const e of entities) {
      const nameComponent = e.getComponent(Components.Name);
      const render = e.getComponent(Components.Renderable)!;

      // This will now work if the highest zIndex is 0
      if (nameComponent && render.zIndex > highestZIndex) {
        highestZIndex = render.zIndex;
        labelName = nameComponent.name;
      }

```

If we run the game now though, after some exploring we'll find the stairs!

![bandage-description](/img/chapter-12/label-fix.gif)

Now we need a way to detect if the player walked on the stairs, and move to a new level if so. We can create a system to handle this for us!

```ts
// src/systems/level-system.ts
// MAKE SURE TO ADD THIS TO src/systems/index.ts AND REGISTER IT IN app.ts!
import { Calc } from "malwoden";
import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

const MAP_WIDTH = 80;
const MAP_HEIGHT = 43;

export class LevelSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    levelEntities: {
      components: [Components.Position],
    },
    canDescend: {
      components: [Components.Position, Components.CanDescend],
    },
  };

  execute() {
    const levelEntities = this.queries.levelEntities.results;
    const canDescendEntities = this.queries.canDescend.results;

    const playerPos = this.game.player.getMutableComponent(
      Components.Position
    )!;

    let playerCanDescend = false;
    for (const e of canDescendEntities) {
      const pos = e.getComponent(Components.Position)!;
      if (Calc.Vector.areEqual(pos, playerPos)) {
        playerCanDescend = true;
        break;
      }
    }

    // if the player can't descend, nothing to do!
    if (playerCanDescend === false) return;

    // the player can descend, remove this level and make a new one
    this.game.log.addMessage("Descending Stairs!");

    // need to remove everything on the map that isn't a player
    const toDelete = levelEntities.filter((e) => e.id !== this.game.player.id);
    while (toDelete.length) {
      const e = toDelete.pop();
      e?.remove();
    }

    // create the new level
    const level = this.game.levelGen.generateBasicLevel({
      width: MAP_WIDTH, // we'll eventually move these to a global location
      height: MAP_HEIGHT,
    });
    this.game.map = level.map;

    // move the player to the new start
    playerPos.x = level.playerStart.x;
    playerPos.y = level.playerStart.y;
  }
}
```

We'll also want to run this before all our other systems each loop.

```ts
// src/app.ts
// ...

      .registerComponent(Components.CanDescend)
      .registerSystem(Systems.LevelSystem, this)
      .registerSystem(Systems.VisibilitySystem, this)
      .registerSystem(Systems.EnemyAISystem, this)
      .registerSystem(Systems.MeleeCombat, this)
```

If we finally try the game, we can see the player switch levels! I bumped the HP of my player up just to help explore for now.

![descend-stairs](/img/chapter-12/descend-stairs.gif)

## Win/Loss Conditions 

The last thing we need for our game to really be complete is a win condition! Let's add a crate of survival goods on the 3rd floor, rather than creating stairs. If the player get to the crate, they win! If they lose all their HP first though, they lose. Let's start with a new component and prefab for the survival goods.

```ts
// src/components.ts
//...

// make sure to register it in app.ts!
export class WinOnPickup extends Component<WinOnPickup> {}
```

```ts
// src/prefabs.ts
//...
export function survivalCrate(world: World): Entity {
  return world
    .createEntity()
    .addComponent(Components.Renderable, {
      glyph: new Glyph("=", Color.Yellow), // Yellow '=' is our crate
    })
    .addComponent(Components.Name, { name: "Survival Crate" })
    .addComponent(Components.WinOnPickup);
}
```

Now we need to update out game to keep track of what level we're on. Let's add a new field onto our `Game` object.

```ts
// src/app.ts
//...

export class Game {
  // ...

  keysOverworld = new OverworldContext(this);
  keysInventory = new InventoryContext(this);

  level = 0; // Keep track of the level

  constructor() {
    this.registerComponents();
    const level = this.levelGen.generateBasicLevel({
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    });
```

Now we need to update our level-gen to generate a survival crate on the 3rd floor, rather than stairs. We'll pass in the current level, which we could also use down the road to make later levels more difficult.

```ts
// src/level-gen.ts
//...

interface GenerateLevelConfig {
  width: number;
  height: number;
  level: number; // Add a level param here
}

// ...

  generateBasicLevel({ width, height, level }: GenerateLevelConfig): LevelData { // add the 'level' param here
    const map = GameMap.GenMapRoomsAndCorridors(width, height);
    // ...


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
```

Make sure we pass the level in when we first start our game in `app.ts` as well!

```ts
// src/app.ts
//...

  constructor() {
    this.registerComponents();
    const level = this.levelGen.generateBasicLevel({
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      level: this.level, // pass in the level
    });
```

We also need to increment this value whenever we go down stairs. Let's update our level system to match.


```ts
// src/systems/level-system.ts
//...

    // the player can descend, remove this level and make a new one
    this.game.level += 1 // increment level
    this.game.log.addMessage("Descending Stairs!");

    // ...

    // create the new level
    const level = this.game.levelGen.generateBasicLevel({
      width: MAP_WIDTH, // we'll eventually move these to a global location
      height: MAP_HEIGHT,
      level: this.game.level, // pass in the level
    });
```

Finally we need to add a system to see if the player is on the survival crate, and if so switch us to a win state. We could potentially fit this logic into our stair system for now, but it would be cleaner to make a new system for win/loss conditions. Let's start by adding win/loss conditions as possible game states though.

```ts
// src/app.ts
//...

export enum GameState {
  INIT,
  PLAYER_TURN,
  ENEMY_TURN,
  AWAITING_INPUT,
  INVENTORY,
  WON_GAME,
  LOST_GAME
}
```

And our new system should be pretty simple. Make sure to add it to `src/systems/index.ts` and register it in `app.ts` as well though!

```ts
// src/examples/win-system.ts
import { World, System } from "ecsy";
import { Calc } from "malwoden";
import { Game, GameState } from "../app";
import * as Components from "../components";

export class WinSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    winOnPickup: {
      components: [Components.WinOnPickup, Components.Position],
    },
  };

  execute() {
    const { results } = this.queries.winOnPickup;

    const playerPos = this.game.player.getComponent(Components.Position)!;
    for (const e of results) {
      const winPos = e.getComponent(Components.Position)!;

      if (Calc.Vector.areEqual(playerPos, winPos)) {
        this.game.gameState = GameState.WON_GAME;
      }
    }
  }
}

```

Finally let's add two more screens for if the player won or lost the game in our `render` system.

```ts
// src/systems/render.ts
//...
  renderWonGame() {
    this.game.terminal.clear();
    this.game.terminal.writeAt({ x: 35, y: 15 }, "You Won!");
    this.game.terminal.render();
  }

  renderLostGame() {
    this.game.terminal.clear();
    this.game.terminal.writeAt({ x: 35, y: 15 }, "You Lost!");
    this.game.terminal.render();
  }

  execute(): void {
    if (this.game.gameState === GameState.INVENTORY) {
      this.renderInventory();
    } else if (this.game.gameState === GameState.WON_GAME) {
      this.renderWonGame();
    } else if (this.game.gameState === GameState.LOST_GAME) {
      this.renderLostGame();
    } else {
      this.renderWorld();
    }
  }
```

Now if we try playing our game, we finally have a way to win!

![you-won](/img/chapter-12/you-won.gif)

Unfortunately right now if our player dies, our game still crashes/freezes since we never handled that case. Let's go ahead and add a quick check in the death system to transition to our `LOST_GAME` state if it was the player that died.

```ts
// src/systems/death-system.ts
//...

    for (const d of dead) {
      const nameComp = d.getComponent(Components.Name);
      if (nameComp) {
        this.game.log.addMessage(`${nameComp.name} died!`);
      }

      if (d.id === this.game.player.id) { // Add a check if it's the player
        this.game.gameState = GameState.LOST_GAME;
      } else {
        d.remove(true);
      }
    }
```

![you-lost](/img/chapter-12/you-lost.gif)


While there are a lot of quality of life improvements we can still add, we now have a full, playable game! It might still be a bit basic at the moment, but we've got everything in place to add as many different types of content as we want. We can easily create new enemies to fight, new level types, and even new items are easy to add if we add new components. 

[You can find the source code for this chapter here.](https://github.com/Aedalus/malwoden-tutorial/tree/main/chapter-12)