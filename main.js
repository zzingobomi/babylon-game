import * as BABYLON from "@babylonjs/core";
import main from "./scenes/main.js";

const log = console.log;

let engine = new BABYLON.Engine(document.querySelector("canvas"));
let currentScene = new BABYLON.Scene(engine);

await main(BABYLON, engine, currentScene);
