import gameScene from "./gameScene";

let scene = undefined;
export default async function main(BABYLON, engine, currentScene) {
  scene = await gameScene(engine, BABYLON);

  engine.runRenderLoop(() => {
    scene.render();
  });
}
