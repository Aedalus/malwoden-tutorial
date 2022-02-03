import { Terminal } from "malwoden";

const mountNode = document.getElementById("app");
if (!mountNode) throw new Error("mountNode not defined");

const terminal = new Terminal.RetroTerminal({
  width: 50,
  height: 30,
  imageURL: "/fonts/font_16.png",
  charWidth: 16,
  charHeight: 16,
  mountNode,
});

terminal.clear();
terminal.writeAt({ x: 1, y: 1 }, "Hello World!");
terminal.render();
