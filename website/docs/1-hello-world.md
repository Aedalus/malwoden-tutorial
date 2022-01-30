---
sidebar_position: 1
---

# 1 - Hello World

## Download Starter

To get started we'll pull down the `malwoden-tutorial` repo. This contains the finished code for each chapter. If you're ever stuck during a chapter, you can open up this new folder and see the finished code.

```sh
# Make sure you're in a good folder first, will create a ./malwoden-tutorial folder
git clone https://github.com/Aedalus/malwoden-tutorial.git
```

If you're not comfortable with git, you can also download a zip file from [Malwoden's Repo](https://github.com/Aedalus/malwoden-tutorial).

It's easiest to copy the entire `malwoden-tutorial/chapter-1` folder to a brand new location to start. Once ready, fire up your favorite editor + terminal, and let's run some commands to get started.

```sh
# Make sure you're inside the newly copied 'chapter-1' folder.
# Get a fresh install of the dependencies
npm clean-install
# Fire up the program!
npm start
```

If everything worked, you'll see the terminal look like below. You can see at the top that the site is served at `http://localhost:8080`. If you try typing that into the browser now you should see something like below.

![Hello World Image](/img/chapter-1/hello_world.png)

Once you're ready, open the file under `src/app.ts`. While there is plenty in this file already, **let's delete it all and start clean so we learn each piece step by step**. Then we'll add the following as a first line:


```ts
// src/app.ts 
import { Terminal } from "malwoden";
```

This will import the `Terminal` package from Malwoden, letting us use it in this file from now on. Next, we need to find the HTML node that we want to mount the terminal on. If you look in `src/index.html`, you'll see that there is already a div that looks like the following.

```html
<!-- src/index.html -->
  <body>
    <div id="app"></div>
  </body>
```

To reference that div, we need to add the following to our `app.ts`, under the import statement. We query the HTML document by ID, and throw an error if it is not found.

```ts
// src/app.ts
const mountNode = document.getElementById("app");
if (!mountNode) throw new Error("mountNode not defined");
```

Now it's time to setup the terminal. Let's add the following:

```ts
// src/app.ts
const terminal = new Terminal.RetroTerminal({
  width: 50,
  height: 30,
  imageURL: "/fonts/font_16.png",
  charWidth: 16,
  charHeight: 16,
  mountNode,
});
```

Let's break down the above.
- We create a new terminal with `new Terminal.RetroTerminal(...)`. This provides an object we can use to help draw characters on the screen. 
- To create that terminal, we passed in an object as configuration. This includes how many characters wide and tall we wanted the terminal to appear, as well as the font that we want to use. These are all supplied as part of the starter, so you don't need to worry about changing any of these settings.
- At the end of the terminal config object, we see a reference to `mountNode`, which we defined earlier. This one might look a bit weird, because if uses a bit of Javascript shorthand. Usually keys and values look like `key: value`, such as `width: 50`. However when the key and value name both match, like `mountNode: mountNode`, Javascript lets us shorten this to `mountNode`. This is known as [object property shorthand](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#new_notations_in_ecmascript_2015). While it's not super important to understand in detail, it often keeps code cleaner and we'll see it a lot in this tutorial.

If you try refreshing the screen, you should see a black box. Not too exciting yet, so let's try to write to it!

```ts
// src/app.ts
// ...

terminal.clear();
terminal.writeAt({ x: 1, y: 1 }, "Hello World!");
terminal.render();
```

There are multiple ways to write to the terminal, but this is one of the easiest. First we `clear` the terminal to make sure if anything we're to be written there previously, we clear it. Like shaking an Etch a Sketch. Then we use the `writeAt` method to first select a start location, and then give it the text we want to write. This start location has a special format, where we're passing in an object with an `x` and a `y` coordinate, `{x: 1, y: 1}`. Malwoden calls such an object a *Vector2*, and we'll see this type of object pretty often. The important thing to remember is that the starting coordinate `{x: 0, y: 0}` is at the *top left* of the terminal. This might seem counter-intuitive at first, but is the common convention in computer graphics.

It's important to note that using the `writeAt` method doesn't *immediately* write to the screen, as it's more efficient to wait until we know we have everything we want before we draw anything. The final `render` method call takes these batched changes, and draws them to the screen.

If you refresh the page, you should see an image like so!

![Hello World Image](/img/chapter-1/hello_world.png)

That's it for the first chapter! In the next chapter we'll look at starting to make a player character we can move around the screen.

[You can find the source code for this chapter here.](https://github.com/Aedalus/malwoden-tutorial/tree/main/chapter-1)
