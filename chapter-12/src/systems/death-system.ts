import { World, System, Entity } from "ecsy";
import { Game, GameState } from "../app";
import * as Components from "../components";

export class DeathSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    canDie: {
      components: [Components.CombatStats],
    },
  };

  execute() {
    const { results } = this.queries.canDie;

    const dead: Entity[] = [];

    for (const e of results) {
      const combatStats = e.getMutableComponent(Components.CombatStats)!;
      if (combatStats.hp <= 0) {
        dead.push(e);
      }
    }

    for (const d of dead) {
      const nameComp = d.getComponent(Components.Name);
      if (nameComp) {
        this.game.log.addMessage(`${nameComp.name} died!`);
      }

      if (d.id === this.game.player.id) {
        this.game.gameState = GameState.LOST_GAME;
      } else {
        d.remove(true);
      }
    }
  }
}
