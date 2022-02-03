import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";
import * as Actions from "../actions";

export class MeleeCombat extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    attemptsToMelee: {
      components: [Components.AttemptToMelee, Components.Position],
    },
  };

  execute() {
    const { results } = this.queries.attemptsToMelee;

    for (const attacker of results) {
      const attempt = attacker.getComponent(Components.AttemptToMelee)!;
      const defender = attempt.defender;

      const attackerStats = attacker.getComponent(Components.CombatStats);
      const defenderStats = defender.getComponent(Components.CombatStats);
      if (!attackerStats) throw new Error("Attacker does not have CombatStats");
      if (!defenderStats) throw new Error("Defender does not have CombatStats");

      attacker.removeComponent(Components.AttemptToMelee);

      const dmg = Math.max(0, attackerStats.power - defenderStats.defense);
      if (dmg === 0) {
        console.log("unable to hurt enemy!");
      } else {
        console.log("attacked for " + dmg);
        Actions.inflictDamage(defender, dmg);
      }
    }
  }
}
