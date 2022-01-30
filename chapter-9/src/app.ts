import { Terminal, Color, Input, Rand } from "malwoden";
import { World, Entity } from "ecsy";
import * as Components from "./components";
import * as Systems from "./systems";
import * as Actions from "./actions";
import { GameMap } from "./game-map";
import { GameLog } from "./game-log";

const MAP_WIDTH = 80;
const MAP_HEIGHT = 43;

export enum GameState {
  INIT,
  PLAYER_TURN,
  ENEMY_TURN,
  AWAITING_INPUT,
}

export class Game {
  input = new Input.KeyboardHandler();
  mouse = new Input.MouseHandler();
  terminal = this.createTerminal();
  lastTime = performance.now();
  world = new World();
  player: Entity;
  gameState = GameState.INIT;
  map = GameMap.GenMapRoomsAndCorridors(MAP_WIDTH, MAP_HEIGHT);
  log = new GameLog();

  constructor() {
    this.registerComponents();
    this.registerPlayerInput();
    const { player } = this.initWorld();
    this.player = player;

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
      if (this.gameState !== GameState.AWAITING_INPUT) return;

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
      .registerSystem(Systems.VisibilitySystem, this)
      .registerSystem(Systems.EnemyAISystem, this)
      .registerSystem(Systems.MeleeCombat, this)
      .registerSystem(Systems.DamageSystem, this)
      .registerSystem(Systems.DeathSystem, this)
      .registerSystem(Systems.MapIndexing, this)
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
    for (let i = 1; i < this.map.rooms.length; i++) {
      const room = this.map.rooms[i];

      const e = this.world
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

    return { player };
  }

  tick(delta: number, time: number) {
    // Execute Systems
    this.world.execute(delta, time);

    if (this.gameState === GameState.INIT) {
      this.gameState = GameState.PLAYER_TURN;
    } else if (this.gameState === GameState.PLAYER_TURN) {
      this.gameState = GameState.ENEMY_TURN;
    } else if (this.gameState === GameState.ENEMY_TURN) {
      this.gameState = GameState.PLAYER_TURN;
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
