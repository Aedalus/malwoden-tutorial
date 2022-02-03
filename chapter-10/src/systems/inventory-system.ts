import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

export class InventorySystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    wantsToPickup: {
      components: [Components.AttemptToPickupItem],
    },
  };

  execute() {
    const { results } = this.queries.wantsToPickup;

    // All entities that want to pick up something
    for (const e of results) {
      const wantsToPickup = e.getComponent(Components.AttemptToPickupItem)!;
      const inventory = e.getComponent(Components.Inventory);
      const entityName = e.getComponent(Components.Name)?.name || "Someone";
      const item = wantsToPickup.item;
      const itemName = item.getComponent(Components.Name)?.name || "something";

      if (inventory) {
        inventory.items.push(wantsToPickup.item);
        item.removeComponent(Components.Position);
        this.game.log.addMessage(`${entityName} picked up ${itemName}`);
      }

      e.removeComponent(Components.AttemptToPickupItem);
    }
  }
}
