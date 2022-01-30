import { Terminal, Color, Input, Vector2 } from "malwoden";
import { World, Entity } from "ecsy";
import * as Components from "./components";
import * as Systems from "./systems";
import { GameMap, TileType } from "./game-map";

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
      });

    return { player };
  }

  async tick(delta: number, time: number) {
    // Handle Player Input
    if (this.gameState === "PLAYER_TURN") {
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

function tryMoveEntity(e: Entity, delta: Vector2, game: Game) {
  const pos = e.getMutableComponent(Components.Position);
  if (!pos) {
    console.warn("tried to move an entity without a position");
    return;
  }

  const destination = { x: pos.x + delta.x, y: pos.y + delta.y };
  if (game.map.tiles.get(destination) === TileType.Floor) {
    pos.x = destination.x;
    pos.y = destination.y;
  }
}

const game = new Game();
game.run();
