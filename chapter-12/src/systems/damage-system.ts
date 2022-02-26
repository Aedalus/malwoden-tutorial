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
    healed: {
      components: [Components.CombatStats, Components.IncomingHealing],
    },
  };

  execute() {
    const damaged = this.queries.damaged.results;
    const healed = this.queries.healed.results;

    // Calculate healing first
    for (const e of healed) {
      const combatStats = e.getMutableComponent(Components.CombatStats)!;
      const incHealing = e.getMutableComponent(Components.IncomingHealing)!;
      combatStats.hp = Math.min(
        combatStats.hp + incHealing.amount,
        combatStats.maxHp
      );
      e.removeComponent(Components.IncomingHealing);
    }

    // Then calculate damage
    for (const e of damaged) {
      const combatStats = e.getMutableComponent(Components.CombatStats)!;
      const incDamage = e.getMutableComponent(Components.IncomingDamage)!;
      combatStats.hp -= incDamage.amount;
      e.removeComponent(Components.IncomingDamage);
    }
  }
}
