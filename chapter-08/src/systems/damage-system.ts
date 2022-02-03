import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

export class DamageSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    damaged: {
      components: [Components.CombatStats, Components.IncomingDamage],
    },
  };

  execute() {
    const { results } = this.queries.damaged;

    for (const e of results) {
      const combatStats = e.getMutableComponent(Components.CombatStats)!;
      const incDamage = e.getMutableComponent(Components.IncomingDamage)!;
      combatStats.hp -= incDamage.amount;
      incDamage.amount = 0; // for now, just set incoming damage back to zero
    }
  }
}
