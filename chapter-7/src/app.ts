import { Terminal, Color, Input, Rand } from "malwoden";
import { World, Entity } from "ecsy";
import * as Components from "./components";
import * as Systems from "./systems";
import * as Actions from "./actions";
import { GameMap } from "./game-map";

export class Game {
  input = new Input.KeyboardHandler();
  terminal = this.createTerminal();
  lastTime = performance.now();
  world = new World();
  player: Entity;
  gameState = "INIT";
  map = GameMap.GenMapRoomsAndCorridors(80, 50);

  constructor() {
    this.registerComponents();
    const { player } = this.initWorld();
    this.player = player;
  }

  createTerminal(): Terminal.RetroTerminal {
    const mountNode = document.getElementById("app");
    if (!mountNode) throw new Error("mountNode not defined");

    return new Terminal.RetroTerminal({
      width: 80,
      height: 50,
      imageURL: "/fonts/font_16.png",
      charWidth: 16,
      charHeight: 16,
      mountNode,
    });
  }

  registerComponents() {
    this.world
      .registerComponent(Components.Position)
      .registerComponent(Components.Renderable)
      .registerComponent(Components.Player)
      .registerComponent(Components.Enemy)
      .registerComponent(Components.Viewshed)
      .registerComponent(Components.BlocksTile)
      .registerSystem(Systems.MapIndexing, this)
      .registerSystem(Systems.VisibilitySystem, this)
      .registerSystem(Systems.EnemyAISystem, this)
      .registerSystem(Systems.RenderSystem, this);
  }

  initWorld(): { player: Entity } {
    const startRoom = this.map.rooms[0];

    const player = this.world
      .createEntity()
      .addComponent(Components.Position, startRoom.center())
      .addComponent(Components.Player)
      .addComponent(Components.Renderable, {
        glyph: new Terminal.Glyph("@", Color.Yellow),
      })
      .addComponent(Components.BlocksTile)
      .addComponent(Components.Viewshed, { range: 7 });

    const rng = new Rand.AleaRNG();

    // Create monsters
    // Skip the first room with the player
    for (let i = 1; i < this.map.rooms.length; i++) {
      const room = this.map.rooms[i];

      const creatureType = rng.nextInt(0, 100);

      const glyph =
        creatureType < 50
          ? new Terminal.Glyph("Z", Color.Red)
          : new Terminal.Glyph("R", Color.Red);

      this.world
        .createEntity()
        .addComponent(Components.Enemy)
        .addComponent(Components.Position, room.center())
        .addComponent(Components.Renderable, { glyph })
        .addComponent(Components.BlocksTile)
        .addComponent(Components.Viewshed, { range: 5 });
    }

    return { player };
  }

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

    // Execute Systems
    this.world.execute(delta, time);

    if (this.gameState === "INIT") {
      this.gameState = "PLAYER_TURN";
    }
  }

  async run() {
    const time = performance.now();
    const delta = time - this.lastTime;

    await this.tick(delta, this.lastTime);
    window.requestAnimationFrame(this.run.bind(this));
  }
}

const game = new Game();
game.run();
