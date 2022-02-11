import { Terminal, Input } from "malwoden";
import { World, Entity } from "ecsy";
import * as Components from "./components";
import * as Systems from "./systems";
import { GameMap } from "./game-map";
import { GameLog } from "./game-log";
import { generateLevel } from "./level-gen";
import { InventoryContext, OverworldContext } from "./input";

const MAP_WIDTH = 80;
const MAP_HEIGHT = 43;

export enum GameState {
  INIT,
  PLAYER_TURN,
  ENEMY_TURN,
  AWAITING_INPUT,
  INVENTORY,
}

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

    this.input.setContext(this.keysOverworld);
    this.log.addMessage("Game Start!");
  }

  goToOverworld(awaitingInput: boolean) {
    this.gameState = awaitingInput
      ? GameState.AWAITING_INPUT
      : GameState.PLAYER_TURN;
    this.input.setContext(this.keysOverworld);
  }

  goToInventory() {
    this.gameState = GameState.INVENTORY;
    this.input.setContext(this.keysInventory);
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
      .registerComponent(Components.CombatStats)
      .registerComponent(Components.AttemptToMelee)
      .registerComponent(Components.IncomingDamage)
      .registerComponent(Components.Name)
      .registerComponent(Components.Item)
      .registerComponent(Components.AttemptToPickupItem)
      .registerComponent(Components.IncomingHealing)
      .registerComponent(Components.Consumable)
      .registerComponent(Components.Inventory)
      .registerComponent(Components.Description)
      .registerSystem(Systems.VisibilitySystem, this)
      .registerSystem(Systems.EnemyAISystem, this)
      .registerSystem(Systems.MeleeCombat, this)
      .registerSystem(Systems.DamageSystem, this)
      .registerSystem(Systems.DeathSystem, this)
      .registerSystem(Systems.InventorySystem, this)
      .registerSystem(Systems.MapIndexing, this)
      .registerSystem(Systems.RenderSystem, this);
  }

  tick(delta: number, time: number) {
    // Execute Systems
    this.world.execute(delta, time);

    if (this.gameState === GameState.INIT) {
      this.gameState = GameState.PLAYER_TURN;
    } else if (this.gameState === GameState.PLAYER_TURN) {
      this.gameState = GameState.ENEMY_TURN;
    } else if (this.gameState === GameState.ENEMY_TURN) {
      this.gameState = GameState.AWAITING_INPUT;
    }
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
