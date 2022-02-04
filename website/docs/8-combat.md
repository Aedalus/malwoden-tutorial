---
sidebar_position: 8
---

# 8 - Combat

We've now got enemies able to chase the player, and did some extra work to make sure entities can't move through each other. Let's go ahead and add the ability for enemies to attack, and more importantly for us to attack them! We'll start by creating a new component for combat stats.

```ts
// src/components.ts
//...

export class CombatStats extends Component<CombatStats> {
  hp = 10;
  maxHp = 10;
  defense = 0;
  power = 1;

  static schema = {
    hp: { type: Types.Number },
    maxHp: { type: Types.Number },
    defense: { type: Types.Number },
    power: { type: Types.Number },
  };
}
```

And of course, whenever we make a new component, we have to register it and add it on to the relevant entities.

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
      .registerComponent(Components.CombatStats)

    // ...
    // Start with some basic stats for the player
    const player = this.world
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
      });
    
    // ...
    // And let's make the enemies a bit weaker
    this.world
      .createEntity()
      .addComponent(Components.Enemy)
      .addComponent(Components.Position, room.center())
      .addComponent(Components.Renderable, { glyph })
      .addComponent(Components.BlocksTile)
      .addComponent(Components.Viewshed, { range: 5 })
      .addComponent(Components.CombatStats, {
        hp: 10,
        maxHp: 10,
        power: 4,
        defense: 1,
      });
```

Now we need to come up with an efficient way of figuring out if an enemy is next to us when we attack. We could loop though all enemies, but this could potentially impact performance, especially if we're doing it multiple times each tick. Instead, let's use the map structure to index which entities are where, similar to how we tracked blockedTiles before.

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
  blockedTiles: Struct.Table<boolean>;
  tileContent: Struct.Table<Entity[]>; // Add a new table

  // ...
  // let's initialize it in the constructor with the others
    this.visibleTiles = new Struct.Table(width, height);
    this.exploredTiles = new Struct.Table(width, height);
    this.blockedTiles = new Struct.Table(width, height);
    this.tileContent = new Struct.Table(width, height);
  
  // ...
  // and finally let's add a few helper methods
  clearTileContent() {
    this.tileContent.fill([]);
  }

  addTileContent(tile: Vector2, ...entities: Entity[]) {
    const tileList = this.tileContent.get(tile) || []; // Make sure we default to an empty array
    this.tileContent.set(tile, tileList.concat(...entities)); // Calculate and set the new entityList
  }

  getTileContent(tile: Vector2): Entity[] {
    return this.tileContent.get(tile) || [];
  }

```

Now we just need to update our map-index system to index entities as well as tiles.

```ts
// src/examples/map-index.ts
//...

  static queries = {
    entities: {
      components: [Components.Position],
    },
  };

  execute() {
    const { results } = this.queries.entities;

    this.game.map.clearTileContent();
    this.game.map.populateBlocked();
    for (const e of results) {
      const pos = e.getComponent(Components.Position)!;
      const blocker = e.getComponent(Components.BlocksTile);
      this.game.map.addTileContent(pos, e);
      if (blocker) {
        this.game.map.setBlocked(pos);
      }
    }
  }
```

Now before we're able to attack, we'll create a couple new components as well as a melee combat system. Because we want to keep our systems single purpose as possible, we don't want to try to attack as part of the move action itself, or calculate any damage there. Instead, we'll create `AttemptToMelee` and `IncomingDamage` components, which we'll use to calculate the combat outside the movement system.

```ts
// src/components.ts
//...
export class AttemptToMelee extends Component<AttemptToMelee> {
  // Here we use the ! to make the type system happy,
  // but we need to make sure to always pass in a proper value!
  defender!: Entity;

  static schema = {
    defender: { type: Types.Ref },
  };
}

export class IncomingDamage extends Component<IncomingDamage> {
  amount = 0;

  static schema = {
    amount: { type: Types.Number },
  };
}
```

Now we'll update our move action to check if an entity is in the space with combatStats, and choose to attach an `AttemptToMelee` component rather than move to the new square.

```ts
// src/actions.ts
//...

  const destination = absolute
    ? position
    : { x: pos.x + position.x, y: pos.y + position.y };

  for (const other of game.map.getTileContent(destination)) { // New check
    const combatStats = other.getComponent(Components.CombatStats);
    if (combatStats) {
      e.addComponent(Components.AttemptToMelee, { defender: other });
      return; // don't continue to move
    }
  }
```

Then we need to make a new system for calculating melee combat.

```ts
// src/systems/melee-combat.ts

import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

export class MeleeCombat extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    attemptsToMelee: {
      components: [Components.AttemptToMelee, Components.Position],
    },
  };

  execute() {
    const { results } = this.queries.attemptsToMelee;

    for (const attacker of results) { // Get each attacker
      const attempt = attacker.getComponent(Components.AttemptToMelee)!;
      const defender = attempt.defender;

      // Make sure each attacker/defender pair both have stats
      const attackerStats = attacker.getComponent(Components.CombatStats); 
      const defenderStats = defender.getComponent(Components.CombatStats);
      if (!attackerStats) throw new Error("Attacker does not have CombatStats");
      if (!defenderStats) throw new Error("Defender does not have CombatStats");

      // prevent the attacker from continuing to attack!
      attacker.removeComponent(Components.AttemptToMelee);

      // Super simple damage calculation for now
      const dmg = Math.max(0, attackerStats.power - defenderStats.defense);

      if (dmg === 0) {
        console.log("unable to hurt enemy!");
      } else {
        console.log("attacked for " + dmg);
        // We'll add damage here
      }
    }
  }
}

```

We're also going to make a really quick action to help with adding damage. We don't want to have more than one IncomingDamage component per entity, so we're going to make a quick helper action to make a new one if needed, otherwise increment an existing one.

```ts
// src/actions.ts
//...

export function inflictDamage(e: Entity, amount: number) {
  if (!e.hasComponent(Components.IncomingDamage)) {
    e.addComponent(Components.IncomingDamage, { amount });
  } else {
    const incDamage = e.getMutableComponent(Components.IncomingDamage)!;
    incDamage.amount += amount;
  }
}
```

Back in our melee system, we'll use this action to safely inflict damage, whether or not the entity already has an IncomingDamage component.

```ts
// src/systems/melee-combat.ts
// ...
import * as Actions from "../actions"; // Add a new import statement

//...

      if (dmg === 0) {
        console.log("unable to hurt enemy!");
      } else {
        console.log("attacked for " + dmg);
        Actions.inflictDamage(defender, dmg);
      }
```

Now we'll add two last systems. The first will take incoming damage and actually apply it to an entity, the second will loop through all entities and see if any need to be deleted.

```ts
// src/systems/damage-system.ts
import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

export class DamageSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    damaged: {
      components: [Components.CombatStats, Components.IncomingDamage],
    },
  };

  execute() {
    const { results } = this.queries.damaged;

    for (const e of results) {
      const combatStats = e.getMutableComponent(Components.CombatStats)!;
      const incDamage = e.getMutableComponent(Components.IncomingDamage)!;
      combatStats.hp -= incDamage.amount;
      incDamage.amount = 0; // for now, just set incoming damage back to zero
    }
  }
}
```

```ts
// src/death-system.ts
import { World, System, Entity } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

export class DeathSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    canDie: {
      components: [Components.CombatStats],
    },
  };

  execute() {
    const { results } = this.queries.canDie;

    const dead: Entity[] = [];

    for (const e of results) {
      const combatStats = e.getMutableComponent(Components.CombatStats)!;
      if (combatStats.hp <= 0) {
        dead.push(e);
      }
    }

    for (const d of dead) {
      d.remove(true);
    }
  }
}
```

Alright, that's a lot! Let's register all our new systems and components, and try it out.

```ts
// src/systems/index.ts
export { RenderSystem } from "./render";
export { VisibilitySystem } from "./visibility";
export { EnemyAISystem } from "./enemy-ai";
export { MapIndexing } from "./map-indexing";
export { MeleeCombat } from "./melee-combat";
export { DamageSystem } from "./damage-system";
export { DeathSystem } from "./death-system";
```

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
      .registerSystem(Systems.MapIndexing, this)
      .registerSystem(Systems.VisibilitySystem, this)
      .registerSystem(Systems.EnemyAISystem, this)
      .registerSystem(Systems.MeleeCombat, this)
      .registerSystem(Systems.DamageSystem, this)
      .registerSystem(Systems.DeathSystem, this)
      .registerSystem(Systems.RenderSystem, this);
  }
```

Now time to finally try it out, and we'll see it's largely working!

![kill enemy](/img/chapter-8/monster-kill.gif)

However if we play around with it a bit more, you'll likely notice that sometimes it seems like you almost 'miss' your first hit, and other times you can't move onto a space the enemy just died on. Seems like we've got a bug, but fortunately it's not too difficult to fix. 

If we look at our game loop right now, between the tick function and the order the systems were registered in, you can see th issue. Conceptually, our game loop looks like this right now:

- Get player input
- Player moves/attacks
- Index the map
- Enemy Turn
- Melee/Damage/Death systems
- Render

Unfortunately this doesn't work perfectly, as the indexing doesn't happen between the enemy's turn, and the players turn again! Really what we want conceptually, is loop like

- Player OR Enemy Turn
- Either one moves/attacks
- Melee/Damage/Death systems
- Render
- Index the map (Needs to happen once before player turn!)

Let's change our flow a bit to match this. First, we're going to change out gameState field a bit, as well as change the order of our MapIndexing system.

```ts
// src/app.ts
//...

export enum GameState {
  INIT,
  PLAYER_TURN,
  ENEMY_TURN,
}

export class Game {
  input = new Input.KeyboardHandler();
  terminal = this.createTerminal();
  lastTime = performance.now();
  world = new World();
  player: Entity;
  gameState = GameState.INIT;

  // ...

      .registerSystem(Systems.VisibilitySystem, this)
      .registerSystem(Systems.EnemyAISystem, this)
      .registerSystem(Systems.MeleeCombat, this)
      .registerSystem(Systems.DamageSystem, this)
      .registerSystem(Systems.DeathSystem, this)
      .registerSystem(Systems.MapIndexing, this) // Change map indexing to right before render system
      .registerSystem(Systems.RenderSystem, this);
  // ...

  // update our tick function to use the new enum
  async tick(delta: number, time: number) {
    // Handle Player Input
    if (this.gameState === GameState.PLAYER_TURN) {
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

    // Execute Systems
    this.world.execute(delta, time);

    if (this.gameState === GameState.INIT) {
      this.gameState = GameState.PLAYER_TURN;
    } else if (this.gameState === GameState.PLAYER_TURN) {
      this.gameState = GameState.ENEMY_TURN;
    } else if (this.gameState === GameState.ENEMY_TURN) {
      this.gameState = GameState.PLAYER_TURN;
    }
```

Unfortunately ECSY doesn't have a great way I've found to conditionally run systems, and we need a way to only run the EnemyAI system on the enemy's turn. However we can get around this for now, by simply adding the following to the EnemyAI system.

```ts
// src/systems/enemy-ai.ts
import { Game, GameState } from "../app"; // Import GameState from app as well

  // First line of execute, we check if we want to skip
  execute() {
    if (this.game.gameState !== GameState.ENEMY_TURN) return;
```

Again, it might not be immediately clear why making these changes would be the fix. It can help to try to run through one or two turns mentally, tracing the path the code takes, to try and understand it better. High level, we're trying to make sure that only the player or enemies move each tick, controlled by the changes to gameState. Conceptually we need to re-index the map *before* anything happens each tick, but in practice this is difficult to coordinate between ECSY and waiting for player input. Instead, we actually re-index at the *end* of each turn, and know that the map index will be 'fresh' for the following turn. This imposes two constraints though! First, we must run through all the system once before either the player or the enemies move to re-index the map the first time, which we cover in the `INIT` game state. Second, any changes to the map-index *within* a single tick, like two enemies both moving, we need to update this cache manually. For now we can get away with it without making any additional changes, since enemies are only interested in the player. However in the future we'll need to keep this in mind. If we try running the game again and look at the logs, you'll see the movement/attacking works as expected now.

![melee working](/img/chapter-8/melee-working.gif)

This was a long chapter, but we're really starting to see the skeleton of a game come together. In the next chapter, we'll look at starting to add a basic interface alongside the game screen.

[You can find the source code for this chapter here.](https://github.com/Aedalus/malwoden-tutorial/tree/main/chapter-08)