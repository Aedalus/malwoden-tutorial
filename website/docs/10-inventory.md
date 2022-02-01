---
sidebar_position: 1
---

# 10 - Inventory

Our game is starting to come along, but without items it's hard to get a true roguelike experience. Let's work on adding some. If you've tried making a game in the past, you may have tried something like an `Item` class. With ECS though, everything we make will have to be an entity! That means an item can still use the `Renderable`, `Name`, and `Position` components that we have, but we'll have to create a few more to really be able to use them. Let's start with a few basic ones.

```ts
// src/components.ts
// At the bottom of the file

// A basic 'item' tag, like 'enemy' or 'player'
export class Item extends Component<Item> {}

// Like 'AttemptToMelee', tracks the intent of a player/entity
// A system can allow us to pick this up
export class AttemptToPickupItem extends Component<AttemptToPickupItem> {
  entity!: Entity;
  item!: Entity;

  static schema = {
    entity: { type: Types.Ref },
    item: { type: Types.Ref },
  };
}

// Can attach to a player/monster
export class Inventory extends Component<Inventory> {
  items!: Entity[];

  static schema = {
    owner: { type: Types.Ref },
  };
}
```

Remember to register all these components as well!

```ts
// src/app.ts
//...
  registerComponents() {
    this.world
      .registerComponent(Components.Position)
      .registerComponent(Components.Renderable)
      .registerComponent(Components.Player)
      .registerComponent(Components.Enemy)
      .registerComponent(Components.Viewshed)
      .registerComponent(Components.BlocksTile)
      .registerComponent(Components.CombatStats)
      .registerComponent(Components.AttemptToMelee)
      .registerComponent(Components.IncomingDamage)
      .registerComponent(Components.Name)
      .registerComponent(Components.Item) // New components!
      .registerComponent(Components.AttemptToPickupItem)
      .registerComponent(Components.Inventory)
      .registerSystem(Systems.VisibilitySystem, this)
      .registerSystem(Systems.EnemyAISystem, this)
      .registerSystem(Systems.MeleeCombat, this)
      .registerSystem(Systems.DamageSystem, this)
      .registerSystem(Systems.DeathSystem, this)
      .registerSystem(Systems.MapIndexing, this)
      .registerSystem(Systems.RenderSystem, this);
  }

```

Now let's update our game to start creating items. But first, it would be so much easier if we has a dedicated place we did all of our level generation. Let's move some of this logic out of `app.ts`, and into a new `level-gen.ts` file.

I won't go over this file in too much detail, as it's really just the logic from the `initWorld` function slightly modified.

```ts
// src/level-gen.ts
import { Entity, World } from "ecsy";
import { GameMap } from "./game-map";
import * as Components from "./components";
import { Color, Rand, Terminal } from "malwoden";

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
    })
    .addComponent(Components.BlocksTile)
    .addComponent(Components.Viewshed, { range: 7 })
    .addComponent(Components.CombatStats, {
      hp: 30,
      maxHp: 30,
      power: 5,
      defense: 2,
    })
    .addComponent(Components.Name, { name: "Player" });

  const rng = new Rand.AleaRNG();

  // Create monsters
  // Skip the first room with the player
  for (let i = 1; i < map.rooms.length; i++) {
    const room = map.rooms[i];

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
      e.addComponent(Components.Renderable, { glyph: zombieGlyph });
      e.addComponent(Components.Name, { name: "Zombie" });
    } else {
      e.addComponent(Components.Renderable, { glyph: raiderGlyph });
      e.addComponent(Components.Name, { name: "Raider" });
    }
  }

  return {
    map,
    player,
  };
}

```

Make sure to fully delete the `initWorld` function from `app.ts`. Then we just need to change the `Game` constructor a tiny bit to use the new function.

```ts
// src/app.ts
//...

export class Game {
  input = new Input.KeyboardHandler();
  mouse = new Input.MouseHandler();
  terminal = this.createTerminal();
  lastTime = performance.now();
  world = new World();
  player: Entity;
  gameState = GameState.INIT;
  map: GameMap; // Don't instantiate this yet
  log = new GameLog();

  constructor() {
    this.registerComponents();
    this.registerPlayerInput();

    // Generate a new level
    const { player, map } = generateLevel({
      world: this.world,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    });
    this.player = player;
    this.map = map;

    this.log.addMessage("Game Start!");
  }
```

If we run the game again, we should see it working just like before. Now let's edit our `level-gen.ts` file to add some new `Bandage` objects to our rooms. They won't do anything for now, but we'll be able to pick them up and use them by the end of the chapter.

First lets add a new function to our level-gen for now to create a potion, given an ECSY World and a position.

```ts
// src/level-gen.ts
// ...
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
```

Then we'll update the `generateLevel` function a tiny bit. For each room in the map, we will have a chance of spawning health potions.

```ts
// src/level-gen.ts
//...
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

```

![Bandage](/img/chapter-10/bandage.png)

However if we walk over an item, there's a good chance the item is drawn over us! This isn't good. Let's add a `z-index` to our `Renderable` component. We'll borrow this convention from css, where a higher z-index is rendered last.

```ts
// src/components.ts
//...
export class Renderable extends Component<Renderable> {
  glyph!: Terminal.Glyph;
  zIndex = 0;

  static schema = {
    glyph: { type: Types.Ref },
    zIndex: { type: Types.Number },
  };
}
```

Then in our `systems/render.ts`, let's update our code to first sort on the z-index before we draw the entities. This way the entity with the highest z-index is drawn last. Similarly for the label, we want to find the entity with the highest z-index.

```ts
// src/systems/render.ts
//...

    const zIndexSort = results.sort((e1, e2) => {
      const e1Render = e1.getComponent(Components.Renderable)!;
      const e2Render = e2.getComponent(Components.Renderable)!;
      return e1Render.zIndex - e2Render.zIndex;
    });

    for (const e of zIndexSort) {
      const p = e.getComponent(Components.Position)!;
      const r = e.getComponent(Components.Renderable)!;

      // If not in range, skip
      if (this.game.map.visibleTiles.get(p) === false) continue;

      this.game.terminal.drawGlyph(p, r.glyph);
    }

    // ... 

    // Label
    const mousePos = this.game.mouse.getPos();
    const tilePos = this.game.terminal.windowToTilePoint(mousePos);
    const entities = this.game.map.getTileContent(tilePos);
    let labelName = "";
    let highestZIndex = 0;

    for (const e of entities) {
      const nameComponent = e.getComponent(Components.Name);
      const render = e.getComponent(Components.Renderable)!;

      if(nameComponent && render.zIndex > highestZIndex) {
        highestZIndex = render.zIndex
        labelName = nameComponent.name
      }
    }
```

Finally, we need to update our components to actually use the z-index! Let's assume the default `0` will be left to items for now, and update the player's and enemies' z-index to `10` to give us a bit of room to build on.


```ts
// src/level-gen.ts
//...
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
    .addComponent(Components.Name, { name: "Player" });

  // further down

  if (creatureType < 50) {
    e.addComponent(Components.Renderable, { glyph: zombieGlyph, zIndex: 10 });
    e.addComponent(Components.Name, { name: "Zombie" });
  } else {
    e.addComponent(Components.Renderable, { glyph: raiderGlyph, zIndex: 10 });
    e.addComponent(Components.Name, { name: "Raider" });
  }
```

If we render the game now, the player should always be able to step onto items, rather than the items covering the player.

## Picking Up Items

Items are now spawning in our rooms, but we still don't have an easy way to pick them up! High level, we still need to 

- Add an `Inventory` component to at least the player for now. Perhaps enemies later!
- Listen to a keypress from the player. If they want to pick up an item, attach a `AttemptToPickupItem` component
- Create a system that monitors `AttemptToPickupItem`, and transfers an item from the map to an inventory.


