---
sidebar_position: 10
---

# 11 - Using Items

In the last chapter we walked through picking up some basic items, and made some bandages we scatter through the dungeon. It sure would be nice if we could actually use those bandages when we're harmed though! Let's start by making it possible to select which item we want to use on the inventory screen. 


## Inventory Keyboard Context

We'll expect a player to use the up/down keys to select an item in their inventory, and then the space bar to use it. This might sound tricky at first, because we're already using the up/down keys to move the player! Fortunately Malwoden has a nice construct for this.

In our `app.ts` file, we're already making one `KeyboardContext` for our game. We also immediately set it to our `KeyboardHandler`, which passes along any events.

```ts
// src/app.ts
  registerPlayerInput() {
    const ctx = new Input.KeyboardContext();
    this.input.setContext(ctx);
```

Fortunately we can actually swap out which context is active at a given time! This will make it easy to switch between "overworld" inputs, compared to "inventory" inputs. Let's make a new file where we can start creating these inputs.

```ts
// src/input.ts
import { Input } from "malwoden";
import { Game, GameState } from "./app";
import * as Actions from "./actions";
import * as Components from "./components";

// We create a class that extends a KeyboardContext
// We move our keyboard code from app.ts here, making
// sure to fix the references
export class OverworldContext extends Input.KeyboardContext {
  game: Game;
  constructor(game: Game) {
    super();
    this.game = game;

    this.onAnyUp((keyEvent) => {
      if (game.gameState !== GameState.AWAITING_INPUT) return;

      switch (keyEvent.key) {
        case Input.KeyCode.LeftArrow: {
          Actions.tryMoveEntity(game, game.player, { x: -1, y: 0 });
          game.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.RightArrow: {
          Actions.tryMoveEntity(game, game.player, { x: 1, y: 0 });
          game.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.UpArrow: {
          Actions.tryMoveEntity(game, game.player, { x: 0, y: -1 });
          game.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.DownArrow: {
          Actions.tryMoveEntity(game, game.player, { x: 0, y: 1 });
          game.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.P: {
          Actions.attemptToPickUp(
            game,
            game.player,
            game.player.getComponent(Components.Position)!
          );
          break;
        }
        case Input.KeyCode.I: {
          game.gameState = GameState.INVENTORY;
        }
      }
    });
  }
}

// We'll make a new InventoryContext as well
export class InventoryContext extends Input.KeyboardContext {
  game: Game;
  constructor(game: Game) {
    super();
    this.game = game;

    this.onAnyUp((keyEvent) => {
      switch (keyEvent.key) {
        case Input.KeyCode.I: // Will use either `i` or `escape`
        case Input.KeyCode.Escape: {
          game.gameState = GameState.AWAITING_INPUT;
          game.input.setContext(game.keysOverworld);
          break;
        }
      }
    });
  }
}
```

Then back in `app.ts`, we need to make a few small changes to use these new contexts.

```ts
// src/app.ts
//...

  // We add our two new contexts, but neither is used yet!
  keysOverworld = new OverworldContext(this);
  keysInventory = new InventoryContext(this);

  constructor() {
    this.registerComponents();
    const { player, map } = generateLevel({
      world: this.world,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    });
    this.player = player;
    this.map = map;

    // In the constructor we choose what one we want
    this.input.setContext(this.keysOverworld);
    this.log.addMessage("Game Start!");
  }

  // Make sure to remove all the old keyboard code from this file as well!

```

We need to make one more switch before we try running it. That `input.setContext()` is what switches between keyboard modes! Wherever we switch the game state, we also need to set the context again. Back in `input.ts`, let's update the following.

```ts
// src/input.ts

// In the OverworldContext class
  case Input.KeyCode.I: {
    game.gameState = GameState.INVENTORY;
    game.input.setContext(game.keysInventory)
  }

// In the InventoryContext class

        case Input.KeyCode.I:
        case Input.KeyCode.Escape: {
          game.gameState = GameState.AWAITING_INPUT;
          game.input.setContext(game.keysOverworld);
          break;
        }

```

If we try running our game again it should work just like before. But this time, we're switching between KeyboardContexts as we open our inventory. If you have any doubt, you can try exiting the inventory with the `escape` key now, as we never had that in the old code!

## Starting Items

Now before we worry too much about selecting items, let's give the player a few bandages to start just to test better.

First at the bottom of the `level-gen.ts` file, let's separate creating a potion item from placing an entity.

```ts
// src/level-gen.ts
//...

    // 50% of spawning a potion
    if (rng.next() < 0.5) {
      const randX = rng.nextInt(room.v1.x, room.v2.x + 1);
      const randY = rng.nextInt(room.v1.y, room.v2.y + 1);
      const potion = getPotion(world); // New functions below!
      placeEntity(potion, { x: randX, y: randY });
    }

// ...
// At bottom of file

// We can replace spawn potion with these two functions!
function placeEntity(entity: Entity, position: Vector2) {
  entity.addComponent(Components.Position, position);
}

function getPotion(world: World): Entity {
  return world
    .createEntity()
    .addComponent(Components.Item)
    .addComponent(Components.Name, { name: "Bandage" })
    .addComponent(Components.Renderable, {
      glyph: new Glyph("b", Color.Orange),
    });
}

```

Now that we separate making the item from placing it, it's also much easier to add it to the player inventory as we spawn the player.

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
    .addComponent(Components.Inventory)
    .addComponent(Components.Name, { name: "Player" });

  // Give the player 3 bandages to start!
  const playerInventory = player.getComponent(Components.Inventory)!;
  for (let i = 0; i < 3; i++) {
    playerInventory.items.push(getPotion(world));
  }
```

![three bandages](/img/chapter-11/three-bandages.png)

## Selecting an Item