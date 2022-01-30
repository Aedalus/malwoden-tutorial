import { Terminal, Color, Input } from "malwoden";
import { World, Entity } from "ecsy";
import * as Components from "./components";
import * as Systems from "./systems";

export class Game {
  input = new Input.KeyboardHandler();
  terminal = this.createTerminal();
  lastTime = performance.now();
  world = new World();
  player: Entity;

  constructor() {
    this.registerComponents();
    const { player } = this.initWorld();
    this.player = player;
  }

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

  registerComponents() {
    this.world
      .registerComponent(Components.Position)
      .registerComponent(Components.Renderable)
      .registerComponent(Components.Player)
      .registerSystem(Systems.RenderSystem, this);
  }

  initWorld(): { player: Entity } {
    const player = this.world
      .createEntity()
      .addComponent(Components.Position, { x: 5, y: 5 })
      .addComponent(Components.Player)
      .addComponent(Components.Renderable, {
        glyph: new Terminal.Glyph("@", Color.Yellow),
      });

    return { player };
  }

  tick(delta: number, time: number) {
    this.world.execute(delta, time);
  }

  run() {
    const time = performance.now();
    const delta = time - this.lastTime;

    this.tick(delta, this.lastTime);
    window.requestAnimationFrame(this.run.bind(this));
  }
}

const game = new Game();
game.run();
