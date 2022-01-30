---
sidebar_position: 1
---

# 2 - ECS

ECS (or Entity Component System) is a software design pattern found most commonly in game development, and which many Roguelike developers advocate for. At a high level, the codebase has three main concepts.

- `Entities` - Each "thing" in your program will likely be an entity. This could be the player, a monster, terrain, a trap, really anything you want. The important thing is that in an ECS system, the entity itself is really nothing more than an identifier, and by itself can't do anything.
- `Components` - While entities can't do anything by themselves, conceptually we can think of them as each being a bag of different `components`. These are data structures we define that help model the game world. For instance, a player will likely have a `Position` component keeping track of where they are in the world, potentially a `Render` component for how to draw them, and down the line even things like `Bleeding` or `Confused` components if you want. They would also have a `Player` component designating them as the player. Monsters would likely have a `Position` and `Render` component as well, but might differ from the player by having things like a `MonsterAI`.
- `Systems` - While the components associate data to an entity, components themselves don't contain any logic. Instead, all logic is divided up into single-purpose systems. A `RenderSystem` system would look at entities that have both a `Position` and `Render` component, and help draw them to the screen. A `MonsterAI` system might be in charge of figuring out what each monster wants to do this turn.

ECS has two main benefits. First, they can often optimize the organization of the actual 1's and 0's, and group similar data closer together. This can result in massive performance improvements if implemented properly in the ECS system. Unfortunately, ***Javascript does not benefit from this as well as other languages.*** 

However even if we don't see as large performance improvements for using ECS, there is another benefit. ECS brings a certain kind of flexibility that can be difficult to achieve otherwise. For instance, if you swapped the `Player` component from the current entity to a monster, the player would now be the monster! 

Although ECS will give us some neat flexibility, it's also not without tradeoffs. For simple games it can be overkill, and though it does make some problems easier, there are some spots that can be more challenging as well. Games can still be very well designed without using ECS, and there's a great [talk from Bob Nystrom](https://www.youtube.com/watch?v=JxI3Eu5DPwE) that illustrates this.

## Let's Get Started

We're going to start with a quick refactor to our `app.ts` file. Let's create a new `Game` class at the top that we can begin to move some of our code into, and will help organize things down the line. We'll start by moving our Terminal code inside. This should all look familiar, but now the terminal will be stored within a game, rather than a potentially global variable.

```ts
// src/app.ts
export class Game {
  terminal = this.createTerminal()

  constructor(){}

  createTerminal(): Terminal.RetroTerminal {
    const mountNode = document.getElementById("app");
    if (!mountNode) throw new Error("mountNode not defined");

    return new Terminal.RetroTerminal({
      width: 50,
      height: 30,
      imageURL: "/fonts/font_16.png",
      charWidth: 16,
      charHeight: 16,
      mountNode,
    });
  }
}
```

Next we need a game loop, which is some piece of code executed constantly in a 'loop' creating the game. We'll eventually handle all our processing in this loop, which will be called dozens of times each second.

```ts
// src/app.ts
export class Game {
  terminal = this.createTerminal()
  lastTime = performance.now(); // We add a field to keep track of the last time the loop ran

  // ...

  tick(delta: number, time: number) {
    // We'll put more code here later
    // For now, let's just write to the terminal every frame
    this.terminal.clear();
    this.terminal.writeAt({ x: 1, y: 1 }, "Hello World!");
    this.terminal.render();
  }

  run() {
    const time = performance.now(); // Get the current time
    const delta = time - this.lastTime; // Calculate the difference

    this.tick(delta, this.lastTime); // Run our tick method with the times calculated
    window.requestAnimationFrame(this.run.bind(this)); // Ask the browser to schedule the 'run' method again when it can
  }
}
```

Most of the above should be pretty straightforward. The `run` method is in charge of calculating the difference in time from the last loop, and will then call the `tick` method which will start containing more logic. The use of `this.run.bind(this)` might look strange to anyone starting out with javascript, but it's a way to make sure the `this.run` we pass to the `requestAnimationFrame` function is called with the proper context. It won't show up again, so don't worry if it's not super clear at the moment.

At this point we can run our game, and we should see exactly what we did before! Such progress!

<!-- ToDo Screenshot -->

## Creating Our First Components

Alright, now that we're done with a short refactor, let's dive into ECS. We'll start by making a new file, `src/components.ts`. Inside, we'll add the following.

```ts
// src/components.ts
import { Component, Types } from "ecsy";
```

We'll be using [ECSY](https://github.com/ecsyjs/ecsy) as our ECS library. There are another of other promising ones on the horizon, but this currently has seen the most support, and I hope would provide the best community to help debug if you get stuck after the tutorial. I'd added it to the project's dependencies in the `package.json` already, so it should be installed so long as you've run an `npm install`. There are a few sharp edges with ECSY, but I'll try to call them out.

Now to define some components. Let's start with three, `Position`, `Renderable`, and `Player`.

```ts
export class Position extends Component<Position> {
  x = 0;
  y = 0;

  static schema = {
    x: { type: Types.Number },
    y: { type: Types.Number },
  };
}
```

ECSY uses generics to get slightly better type safety, which is why have the `Component<Position>` at the end of the first line. From there we declare two fields, `x` and `y`. Remember components are just about storing data, so we have no methods here! We then have to redeclare the fields in a static block to give ECSY a little more metadata about them. While it's not quite as ergonomic, it's not too bad in the grand scheme of things. Let's continue on to the `Renderable` component. This will give us information about what character + colors we want to use to render an entity to the terminal.

```ts
import { Component, Types } from "ecsy";
import { Terminal } from "malwoden"; // Import the Terminal module again from Malwoden

// ...
export class Renderable extends Component<Renderable> {
  glyph!: Terminal.Glyph;

  static schema = {
    glyph: { type: Types.Ref },
  };
}
```

This is a very similar structure to the first component. `Terminal.Glyph` is a class Malwoden exports, which keeps track of a character, foreground, and background color. We'll see it in use in a bit. Because `Terminal.Glyph` is an object rather than a scalar type, we use `Types.Ref` from ECSY to specify it's a reference to the object.

One small sharp edge: we added a `!` to the glyph field (`glyph!: Terminal.Glyph`). This tells typescript that even the glyph can never be undefined, even though we didn't make a constructor to set it. This weakens our type safety by a very small amount, but is necessary to let ECSY instantiate our components for us like we'll see in a bit. Finally, let's make our `Player` component.

```ts
// ...
export class Player extends Component<Player> {}
```

Well that was easy! Why don't we have any fields? We will plan to just have one entity at any time have a `Player` component, so just by an entity having this component at all it gives us all the information we need. That entity is the player! Now that we've defined our components, let's try to go make our first Entity to use them.

## Creating our First Entity

The first thing ECSY needs to create a new entity is a `World`. This is just a collection of entities, components, and systems that we want to work together. We can create a new one easily and add it to our `Game` class.

```ts
// src/app.ts
import { World, Entity } from "ecsy";
import * as Components from "./components"; // New import statement for components

export class Game {
  terminal = this.createTerminal()
  lastTime = performance.now(); // We add a field to keep track of the last time the loop ran
  world = new World();

  constructor() {
    this.registerComponents();
  }

  registerComponents(){
    this.world
      .registerComponent(Components.Position)
      .registerComponent(Components.Renderable)
      .registerComponent(Components.Player)
  }
}
```

To help organize our game's startup, we've added a new method called `registerComponents`, and called it in the constructor. Inside we make sure to register each component on the `world`, so that ECSY knows to expect them. Unless we register a component first, ECSY will throw an error. 

From there we can create an entity that represents our player. Because we'll likely need to reference this entity more than most, we'll go ahead and add it to our `Game` class to now as a field we can easily access elsewhere. Then in the `Game` constructor, we'll create the world and make sure we capture the player.

```ts
// src/app.ts

export class Game {
  // ...
  player : Entity;

  constructor() {
    this.registerComponents();
    const { player } = this.initWorld(); // We'll capture world generation logic in another function
    this.player = player // We get the player back, and store it in out Game object.
  }

  initWorld(): { player: Entity } {
    const player = this.world // Whenever we want to create a new ECS entity, we need to use this.world.createEntity()
      .createEntity()
      .addComponent(Components.Position, { x: 5, y: 5 }) // Here we add the Position component and values to override defaults
      .addComponent(Components.Player) // Add the player component as well
      .addComponent(Components.Renderable, {
        glyph: new Terminal.Glyph("@", Color.Yellow), // Add a Renderable component so we'll be able to draw it to screen
      }); 

    return { player };
  }
}
```

Now if we try to run the Game, we'll see... still the same Hello World! Even though we have the ECS world and our first entity, we're not yet using those to do anything like render to the terminal. Let's create our first system to help out with that.

## Creating The Render System

We'll start by creating both a new folder and file, `src/systems/render.ts`. Because components are so small and don't contain logic, I like to leave them all in a single `src/components.ts` file. However systems can be longer and more complex, so it helps to split each one out.

```ts
// src/components/render.ts
import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

export class RenderSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  execute(){
    // We'll add logic here
  }
}
```

Our RenderSystem's constructor expects both a `World`, and a `Game`. We save the `Game` to a field to access it more easily later. We also stub out an `execute` method, which will eventually be called for every 'tick' of our game. Now to use a system, we first have to select which Components that system is interested in, and get all entities with those components. To do that, we add a new query as part of ECSY.

```ts
// src/components/render.ts
export class RenderSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    renderables: {
      components: [Components.Renderable, Components.Position],
    },
  };

  execute(){
    // We'll add logic here
  }
}

```

Here we've defined a new query, `renderables`, that filters based on `Renderable` and `Position` components. We can then use this in our `execute` method to loop over *only* the entities that have both these components.

```ts
// src/components/render.ts
  execute(){
    const { results } = this.queries.renderables // This matches the name of the query we previously defined

    this.game.terminal.clear() // Start each loop by clearing the screen
    for (const e of results) {
      const p = e.getComponent(Components.Position)!; // Get the position and Renderable components
      const r = e.getComponent(Components.Renderable)!; // Here we use '!' because we know from the query these fields won't be undefined

      this.game.terminal.drawGlyph(p, r.glyph); // Draw the glyph to the terminal. Remember we batch changes until a Render.
    }
    this.game.terminal.render(); // Make sure to call Render to we actually draw!
  }
```

Now before this system starts to work, we need to register it with the ECSY World like we did in the components. Let's switch back and add it, but first we'll use a nice typescript trick to simplify our imports/exports. Let's create the following file first.

```ts
// src/systems/index.ts
export { RenderSystem } from "./render";

```

Then in `src/app.ts`, add this near the top. The `systems/index.ts` file allows us to group all our systems in one place to cleanly import them. Every time we make a new system, we'll add it to this file.

```ts
// src/app.ts
import * as Components from "./components"; // Already exists
import * as Systems from "./systems";
```

Then we need to register the system with ECSY, just like we did the components. Finally we'll replace the contents of our tick function with `this.world.execute(...)`.
This will call the `execute()` method of all systems registered to the world.

```ts
// src/app.ts

  registerComponents() {
    this.world
      .registerComponent(Components.Position)
      .registerComponent(Components.Renderable)
      .registerComponent(Components.Player)
      .registerSystem(Systems.RenderSystem, this); // this refers to the instantiated Game object, which will be passed to the RenderSystem's constructor
  }

  // ...

  tick(delta: number, time: number) {
    this.world.execute(delta, time);
  }

```

If we run the game once more, we'll finally see a player! 

<!-- ToDo Screenshot -->

While this chapter was pretty long, we set up a lot of the groundwork that will let us move fast from here out. In the next chapter we'll work to add some simple movement to the player.

[You can find the source code for this chapter here.](https://github.com/Aedalus/malwoden-tutorial/tree/main/chapter-2)
