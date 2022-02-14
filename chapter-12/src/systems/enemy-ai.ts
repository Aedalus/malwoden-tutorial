import { Calc, Pathfinding } from "malwoden";
import { World, System } from "ecsy";
import { Game, GameState } from "../app";
import * as Components from "../components";
import { TileType } from "../game-map";
import * as Actions from "../actions";

export class EnemyAISystem extends System {
  game: Game;
  pathfinding: Pathfinding.Dijkstra;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;

    this.pathfinding = new Pathfinding.Dijkstra({
      topology: "four",
      isBlockedCallback: (v) => this.game.map.tiles.get(v) === TileType.Wall,
    });
  }

  static queries = {
    enemies: {
      components: [Components.Enemy, Components.Position, Components.Viewshed],
    },
  };

  execute() {
    if (this.game.gameState !== GameState.ENEMY_TURN) return;

    const { results } = this.queries.enemies;
    const player = this.game.player;
    const playerPos = player.getComponent(Components.Position)!;

    for (const e of results) {
      const vs = e.getMutableComponent(Components.Viewshed)!;
      const pos = e.getMutableComponent(Components.Position)!;

      // If the player is in range
      if (vs.containsTile(playerPos)) {
        // Find the path
        const path = this.pathfinding.compute(pos, playerPos);

        if (!path) console.log("no path found!");
        if (path && path[1]) {
          const nextStep = path[1];
          // next step is the player
          if (nextStep.x === playerPos.x && nextStep.y === playerPos.y) {
            e.addComponent(Components.AttemptToMelee, { defender: player });
          } else {
            Actions.tryMoveEntity(this.game, e, nextStep, true);
          }
        }
      }
    }
  }
}
