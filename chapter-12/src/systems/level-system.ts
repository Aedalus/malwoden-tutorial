import { Calc } from "malwoden";
import { World, System } from "ecsy";
import { Game } from "../app";
import * as Components from "../components";

const MAP_WIDTH = 80;
const MAP_HEIGHT = 43;

export class LevelSystem extends System {
  game: Game;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
  }

  static queries = {
    levelEntities: {
      components: [Components.Position],
    },
    canDescend: {
      components: [Components.Position, Components.CanDescend],
    },
  };

  execute() {
    const levelEntities = this.queries.levelEntities.results;
    const canDescendEntities = this.queries.canDescend.results;

    const playerPos = this.game.player.getMutableComponent(
      Components.Position
    )!;

    let playerCanDescend = false;
    for (const e of canDescendEntities) {
      const pos = e.getComponent(Components.Position)!;
      if (Calc.Vector.areEqual(pos, playerPos)) {
        playerCanDescend = true;
        break;
      }
    }

    // if the player can't descend, nothing to do!
    if (playerCanDescend === false) return;

    // the player can descend, remove this level and make a new one
    this.game.level += 1;
    this.game.log.addMessage("Descending Stairs!");

    // need to remove everything on the map that isn't a player
    const toDelete = levelEntities.filter((e) => e.id !== this.game.player.id);
    while (toDelete.length) {
      const e = toDelete.pop();
      e?.remove();
    }

    // create the new level
    const level = this.game.levelGen.generateBasicLevel({
      width: MAP_WIDTH, // we'll eventually move these to a global location
      height: MAP_HEIGHT,
      level: this.game.level,
    });
    this.game.map = level.map;

    // move the player to the new start
    playerPos.x = level.playerStart.x;
    playerPos.y = level.playerStart.y;
  }
}
