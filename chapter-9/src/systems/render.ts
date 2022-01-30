import { World, System } from "ecsy";
import { Terminal, Color, GUI, Glyph, CharCode } from "malwoden";
import { Game } from "../app";
import * as Components from "../components";
import { TileType } from "../game-map";

export class RenderSystem extends System {
  game: Game;
  gui: GUI.ContainerWidget;
  labelWidget?: GUI.LabelWidget;

  constructor(world: World, game: Game) {
    super(world, game);
    this.game = game;
    this.gui = this.constructGUI(game);
  }

  static queries = {
    renderables: {
      components: [Components.Renderable, Components.Position],
    },
  };

  constructGUI(game: Game): GUI.ContainerWidget {
    const container = new GUI.ContainerWidget().setTerminal(game.terminal);

    this.labelWidget = new GUI.LabelWidget({
      initialState: {
        text: "Replace me!",
        direction: "right",
        backColor: Color.Gray,
      },
    })
      .setDisabled()
      .setParent(container);

    const panelWidget = new GUI.PanelWidget({
      origin: { x: 0, y: 43 },
      initialState: {
        width: 80,
        height: 7,
        borderStyle: "double-bar",
      },
    }).setParent(container);

    const textWidget = new GUI.TextWidget({
      origin: { x: 3, y: 0 },
      initialState: { text: " HP 30/30 " },
    })
      .setParent(panelWidget)
      .setUpdateFunc(() => {
        const player = this.game.player;
        const playerStats = player.getComponent(Components.CombatStats);

        return {
          text: playerStats ? `HP ${playerStats.hp}/${playerStats.maxHp}` : "",
        };
      });

    const barWidget = new GUI.BarWidget({
      origin: { x: 15, y: 0 },
      initialState: {
        width: 15,
        maxValue: 100,
        foreGlyph: Glyph.fromCharCode(
          CharCode.blackSquare,
          Color.Red,
          Color.Red
        ),
        backGlyph: Glyph.fromCharCode(
          CharCode.blackSquare,
          Color.DarkRed,
          Color.DarkRed
        ),
      },
    })
      .setParent(panelWidget)
      .setUpdateFunc(() => {
        const player = this.game.player;
        const playerStats = player.getComponent(Components.CombatStats);

        return {
          maxValue: playerStats?.maxHp,
          currentValue: playerStats?.hp,
        };
      });

    return container;
  }

  execute() {
    const { results } = this.queries.renderables;

    this.game.terminal.clear();

    const floorGlyph = new Terminal.Glyph(".", Color.Green);
    const wallGlyph = new Terminal.Glyph("#", Color.Green);

    const floorGlyphExplored = new Terminal.Glyph(".", Color.Gray);
    const wallGlyphExplored = new Terminal.Glyph("#", Color.Gray);

    for (let x = 0; x < this.game.map.width; x++) {
      for (let y = 0; y < this.game.map.height; y++) {
        const v = { x, y };
        const explored = this.game.map.exploredTiles.get(v);
        const visible = this.game.map.visibleTiles.get(v);
        const tile = this.game.map.tiles.get(v);

        if (visible) {
          if (tile === TileType.Floor) {
            this.game.terminal.drawGlyph(v, floorGlyph);
          } else if (tile === TileType.Wall) {
            this.game.terminal.drawGlyph(v, wallGlyph);
          }
        } else if (explored) {
          if (tile === TileType.Floor) {
            this.game.terminal.drawGlyph(v, floorGlyphExplored);
          } else if (tile === TileType.Wall) {
            this.game.terminal.drawGlyph(v, wallGlyphExplored);
          }
        }
      }
    }

    for (const e of results) {
      const p = e.getComponent(Components.Position)!;
      const r = e.getComponent(Components.Renderable)!;

      // If not in range, skip
      if (this.game.map.visibleTiles.get(p) === false) continue;

      this.game.terminal.drawGlyph(p, r.glyph);
    }

    const logs = this.game.log.getLastMessages(5);
    for (let i = 0; i < logs.length; i++) {
      const msg = logs[i];
      this.game.terminal.writeAt({ x: 1, y: 44 + i }, msg);
    }

    // Label
    const mousePos = this.game.mouse.getPos();
    const tilePos = this.game.terminal.windowToTilePoint(mousePos);
    const entities = this.game.map.getTileContent(tilePos);
    let labelName = "";

    for (const e of entities) {
      const nameComponent = e.getComponent(Components.Name);
      if (nameComponent) {
        labelName = nameComponent.name;
        break;
      }
    }

    if (labelName) {
      this.labelWidget?.setDisabled(false);
      this.labelWidget?.setOrigin(tilePos);
      this.labelWidget?.setState({
        text: labelName,
        direction: tilePos.x < 25 ? "right" : "left",
      });
    } else {
      this.labelWidget?.setDisabled();
    }

    this.gui.cascadeUpdate();
    this.gui.cascadeDraw();

    this.game.terminal.render();
  }
}
