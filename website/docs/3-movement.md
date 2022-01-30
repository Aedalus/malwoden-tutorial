---
sidebar_position: 1
---

# 3 - Movement

We've got a basic player rendering to the screen now, but wouldn't it be great if he could move around? Let's start by working on a way to tell when the player presses a key.

Fortunately in javascript, we have a pretty elegant way to handle this with `async/await` patterns. Let's change the following.

```ts
// src/app.ts

  async tick(delta: number, time: number) { // Add 'async' before this method
    const key = await this.input.waitForKeyDown(); // Here we 'await' the player's input
    console.log(input) // Print out the keyCode for now
    this.world.execute(delta, time);
  }

  async run() { // Add 'async' before this method
    const time = performance.now();
    const delta = time - this.lastTime;

    await this.tick(delta, this.lastTime); // We need to add await here as well, to wait for the 'tick' function to finish
    window.requestAnimationFrame(this.run.bind(this));
  }
```

However if you try to refresh the page now, everything is blank! We actually are waiting for the player to press a key before we perform any rendering, which isn't ideal. Let's fix this, and build towards the concept of player/monster turns while we're at it. In the game object, let's add the following field.

```ts
// src/app.ts

export class Game {
  // ...
  gameState = "INIT"

  // ...
  async tick(delta: number, time: number) { // Add 'async' before this method
    if(this.gameState === "PLAYER_TURN"){
      const key = await this.input.waitForKeyDown(); // Here we 'await' the player's input
      console.log(input) // Print out the keyCode for now
    }

    this.world.execute(delta, time);

    if(this.gameState === "INIT"){
      this.gameState = "PLAYER_TURN"
    }
  }

```


Now we're able to at least detect when the player presses a key. If we open the chrome devtools, we can even see the log where we print out some key presses.

<!-- ToDo Screenshot -->
![Movement Gif](/img/chapter-3/console-log.gif)

Now we need some way to take the key that the use pressed, and translate that into player movement. Let's create a new function to help with some of the logic around player movement first, then work on getting it wired up to the input. We'll add this to the bottom of the `app.ts` file for now, but will eventually find a better place for it to live. This will go at the very bottom, outside the class.

```ts
// src/app.ts
// ...

function tryMoveEntity(e: Entity, delta: Vector2) {
  const pos = e.getMutableComponent(Components.Position);
  if (!pos) {
    console.warn("tried to move an entity without a position");
    return;
  }

  pos.x = pos.x + delta.x;
  pos.y = pos.y + delta.y;
}
```

We're not going to do anything too complex here. We expect an `Entity` and a `Vector2` representing the delta to be passed in. The delta is the difference between where the entity is, and where we want it to be. For instance, if the Entity's position is at `(1,1)`, and we want to move it right, the delta would be `(1, 0)`. If we wanted to move it left, `(-1,0)`. If we wanted to move it up, `(-1, 0)`. Remember the y axix has 0 at the top!

From there we get the position component, and throw a warning if the entity didn't have the component. Then, we add the delta's x and y to the current position to get the destination. For now we won't be doing any kind of checking to see if the player runs off the screen, or into a wall. Now to wire it up to the keyboard.

```ts
// src/app.ts

  async tick(delta: number, time: number) {
    // Handle Player Input
    if(this.gameState === "PLAYER_TURN") {
      const key = await this.input.waitForKeyDown();
  
      const actions = new Map<number, () => void>();
      actions.set(Input.KeyCode.LeftArrow, () =>
        tryMoveEntity(this.player, { x: -1, y: -0 })
      );
      actions.set(Input.KeyCode.RightArrow, () =>
        tryMoveEntity(this.player, { x: 1, y: -0 })
      );
      actions.set(Input.KeyCode.UpArrow, () =>
        tryMoveEntity(this.player, { x: 0, y: -1 })
      );
      actions.set(Input.KeyCode.DownArrow, () =>
        tryMoveEntity(this.player, { x: 0, y: 1 })
      );
  
      const cmd = actions.get(key);
      if (cmd) {
        cmd();
      }
    }

    // Execute Systems
    this.world.execute(delta, time);

    if(this.gameState === "INIT"){
      this.gameState = "PLAYER_TURN"
    }
  }
```

The above might seem counter-intuitive at first. We're not using any if/else statements, or any switch statements. Instead, we build up a map from keyCodes to commands. Conceptually it resembles the following:

- LeftKey -> Move Left
- RightKey -> Move Right
- UpKey -> Move Up
- DownKey -> Move Down

Once we've built this map, we simply check to see if the pressed key exists in the map, and if so we execute the corresponding function. Now there's a slight performance concern that we're creating this map every tick, but we can fix that down the line. For now, let's see if the player can move around as expected.

![Movement Gif](/img/chapter-3/movement.gif)

If you set everything up properly, you should be able to move the player around! It's not much fun to be exporing a black screen through. In the next chapter we'll work to create a basic dungeon the player can explore.

You can find the source code for this chapter here.

[You can find the source code for this chapter here.](https://github.com/Aedalus/malwoden-tutorial/tree/main/chapter-3)