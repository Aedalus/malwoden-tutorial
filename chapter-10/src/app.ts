import { Terminal, Input } from "malwoden";
import { World, Entity } from "ecsy";
import * as Components from "./components";
import * as Systems from "./systems";
import * as Actions from "./actions";
import { GameMap } from "./game-map";
import { GameLog } from "./game-log";
import { generateLevel } from "./level-gen";

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

  constructor() {
    this.registerComponents();
    this.registerPlayerInput();
    const { player, map } = generateLevel({
      world: this.world,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
    });
    this.player = player;
    this.map = map;

    this.log.addMessage("Game Start!");
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

  registerPlayerInput() {
    const ctx = new Input.KeyboardContext();
    this.input.setContext(ctx);

    ctx.onAnyUp((keyEvent) => {
      if (
        this.gameState !== GameState.AWAITING_INPUT &&
        this.gameState !== GameState.INVENTORY
      )
        return;

      switch (keyEvent.key) {
        case Input.KeyCode.LeftArrow: {
          Actions.tryMoveEntity(this, this.player, { x: -1, y: 0 });
          this.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.RightArrow: {
          Actions.tryMoveEntity(this, this.player, { x: 1, y: 0 });
          this.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.UpArrow: {
          Actions.tryMoveEntity(this, this.player, { x: 0, y: -1 });
          this.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.DownArrow: {
          Actions.tryMoveEntity(this, this.player, { x: 0, y: 1 });
          this.gameState = GameState.PLAYER_TURN;
          break;
        }
        case Input.KeyCode.P: {
          Actions.attemptToPickUp(
            this,
            this.player,
            this.player.getComponent(Components.Position)!
          );
          break;
        }
        case Input.KeyCode.I: {
          if (this.gameState === GameState.AWAITING_INPUT) {
            this.gameState = GameState.INVENTORY;
          } else if (this.gameState === GameState.INVENTORY) {
            this.gameState = GameState.AWAITING_INPUT;
          }
        }
      }
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
      .registerComponent(Components.Inventory)
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
