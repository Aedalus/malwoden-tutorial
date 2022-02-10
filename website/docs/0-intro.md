---
sidebar_position: 0
---

# Intro

## What is Malwoden?

Malwoden is a roguelike engine that can be used to make browser based, ascii games. It is written in typescript, and can be used with either Typescript or Javascript.

You can check out [Malwoden's Example Site](https://malwoden.com/), its [Github Page](https://github.com/Aedalus/malwoden), or [A Short 7DRL Made by the Malwoden Team](https://aedalus.itch.io/malwoden-7drl).
## What does this tutorial cover?

This tutorial goes through the steps of creating a basic, traditional roguelike game that can run in the browser. It leverages an Entity Component System (ECS) architecture through the use of [ECSY](https://github.com/ecsyjs/ecsy). While you don't have to use ECSY to write games with Malwoden, I wanted to show how it can be done cleanly, to better see how Malwoden can integrate with existing libraries. Similarly, while Malwoden can be used with only Javascript, the tutorial showcases how a game can be built using typescript to ensure better type safety and catch potential bugs at runtime.

This tutorial is also based off of an [existing tutorial in Rust created by Herbert Wolverson](https://bfnightly.bracketproductions.com/), and explores how to create a similar game using a different technology stack. I personally found this tutorial invaluable in learning both roguelike and ECS techniques, and encourage anyone who finds this tutorial useful to consider checking out Herbert's tutorial, as well as his [patreon](https://www.patreon.com/blackfuture).


## FAQ

### What do I need to get started?

- `git` - Ideally either a CLI or a gui client, with basic knowledge of either.
- `node/npm` - We will use the `npm` command to install packages and start the site. This comes bundled with [Node](https://nodejs.org/en/). If uncertain of which node version to download, go with the latest LTS release. This tutorial was written with v14.17.x for reference.
- `Code Editor` - You'll want some way to edit typescript files, preferably with code hinting/auto-completion. Just about any will do, though if you're looking for a free one to start with I recommend [VSCode](https://code.visualstudio.com/).

### Do I need to know Javascript/Typescript?
This tutorial assumes a basic level of Javascript/Typescript familiarity from the start. If you're familiar with other programming languages like python, java, or C# you'll likely be able to follow along easily, though some of the syntax might be a bit new.

### I found an issue. What do I do?!
Go ahead and [open an issue](https://github.com/Aedalus/malwoden-tutorial/issues) on the tutorial's github project. It can be hard to keep all the chapters up to date and in sync, and occasionally something slips through. Even just an issue outlining your problem or suggestion is appreciated, though PRs with a fix are *extra* appreciated.
