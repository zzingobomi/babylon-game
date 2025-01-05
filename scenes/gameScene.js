import "@babylonjs/loaders";

function createGround(scene, BABYLON) {
  const { Texture, MeshBuilder, PBRMaterial } = BABYLON;

  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 50, height: 50 },
    scene
  );

  // 강의에서는 normalTexture 라고 되어있지만 Babylon에서는 normalmap 이 bumpTexture 로 되어있음
  // StandardMaterial 은 노말맵 효과가 잘 보이지 않아 PBR 로 대체
  const groundMat = new PBRMaterial("groundMat", scene);
  const diffuseTex = new Texture("./textures/groundTexDiffuse.jpg", scene);
  const normalTex = new Texture("./textures/groundTexNormal.jpg", scene);

  diffuseTex.uScale = 10;
  diffuseTex.vScale = 10;
  normalTex.uScale = 10;
  normalTex.vScale = 10;

  groundMat.albedoTexture = diffuseTex;
  groundMat.bumpTexture = normalTex;
  groundMat.metallic = 0.5;
  groundMat.roughness = 0.5;

  ground.material = groundMat;
}

export default async function gameScene(engine, BABYLON) {
  const {
    ActionManager,
    Scalar,
    Matrix,
    ExecuteCodeAction,
    SceneLoader,
    Vector3,
    FreeCamera,
    HemisphericLight,
    MeshBuilder,
  } = BABYLON;

  let isMoving = false;
  let characterSpeed = 4;
  let ourTargetPos;

  const scene = new BABYLON.Scene(engine);

  const cam = new FreeCamera("camera", new Vector3(0, 0, -5), scene);
  cam.attachControl();

  const light = new HemisphericLight("light", new Vector3(0, 10, 0), scene);

  const dirLight = new BABYLON.DirectionalLight(
    "dirLight",
    new BABYLON.Vector3(-1, -2, -1),
    scene
  );

  // import Tree
  const treeMain = await SceneLoader.ImportMeshAsync(
    "",
    "./models/",
    "tree.glb",
    scene
  );
  const tree = treeMain.meshes[1];
  tree.parent = null;
  treeMain.meshes[0].dispose();

  let treeLength = 30;
  let radius = 50 / 2;
  for (let i = 0; i < treeLength; i++) {
    const randomX = Scalar.RandomRange(-radius, radius);
    const randomZ = Scalar.RandomRange(-radius, radius);

    const treeClone = tree.clone("tree");
    treeClone.position = new Vector3(randomX, 0, randomZ);
  }

  // character creation
  const model = await SceneLoader.ImportMeshAsync(
    "",
    "./models/",
    "character.glb",
    scene
  );
  const anims = model.animationGroups;
  const meshes = model.meshes;
  const rootMesh = meshes[0];
  const characterBox = MeshBuilder.CreateBox(
    "characterBox",
    { size: 1, height: 2 },
    scene
  );
  rootMesh.parent = characterBox;
  characterBox.visibility = 0;
  rootMesh.position.y = -1;
  characterBox.position.y += 1;
  anims.forEach((anim) => anim.name === "idle" && anim.play(true));

  // target box creation
  const targetBox = MeshBuilder.CreateBox("targetBox", { size: 0.2 }, scene);
  targetBox.isPickable = false;
  targetBox.visibility = 0;
  targetBox.actionManager = new ActionManager(scene);
  targetBox.actionManager.registerAction(
    new ExecuteCodeAction(
      {
        trigger: ActionManager.OnIntersectionEnterTrigger,
        parameter: characterBox,
      },
      (e) => {
        stop();
      }
    )
  );

  createGround(scene, BABYLON);

  const cameraContainer = MeshBuilder.CreateGround(
    "ground",
    { width: 0.5, height: 0.5 },
    scene
  );
  cameraContainer.position = new Vector3(0, 15, 0);
  cam.parent = cameraContainer;
  cam.setTarget(new Vector3(0, -10, 0));

  let camVertical = 0;
  let camHorizontal = 0;
  let camSpd = 3;
  window.addEventListener("keydown", (e) => {
    const thekey = e.key.toLowerCase();

    if (thekey === "arrowup") camVertical = 1;
    if (thekey === "arrowdown") camVertical = -1;
    if (thekey === "arrowleft") camHorizontal = -1;
    if (thekey === "arrowright") camHorizontal = 1;
  });
  window.addEventListener("keyup", (e) => {
    const thekey = e.key.toLowerCase();

    if (thekey === "arrowup") camVertical = 0;
    if (thekey === "arrowdown") camVertical = 0;
    if (thekey === "arrowleft") camHorizontal = 0;
    if (thekey === "arrowright") camHorizontal = 0;
  });

  scene.onPointerDown = (e) => {
    if (e.buttons === 1) {
      const pickInfo = scene.pick(scene.pointerX, scene.pointerY);
      if (!pickInfo.hit) return;

      if (pickInfo.pickedMesh.name === "ground") {
        pickInfo.pickedPoint.y = characterBox.position.y;
        ourTargetPos = pickInfo.pickedPoint;
        const distance = calculateDistance(ourTargetPos, characterBox.position);
        if (distance < 1) return console.log("we are near on our target");
        move(ourTargetPos);
      }
    }
  };

  function calculateDistance(targetPos, ourPos) {
    return Vector3.Distance(targetPos, ourPos);
  }

  function move(directionPos) {
    isMoving = true;
    const { x, z } = directionPos;
    characterBox.lookAt(new Vector3(x, characterBox.position.y, z), 0, 0, 0);
    anims.forEach((anim) => anim.name === "running" && anim.play(true));
  }

  function stop() {
    isMoving = false;
    anims.forEach((anim) => anim.name === "running" && anim.stop());
    ourTargetPos = undefined;
  }

  scene.registerAfterRender(() => {
    const deltaTime = engine.getDeltaTime() / 1000;

    cameraContainer.locallyTranslate(
      new Vector3(
        camHorizontal * camSpd * deltaTime,
        0,
        camVertical * camSpd * deltaTime
      )
    );

    if (isMoving && ourTargetPos) {
      const distance = calculateDistance(ourTargetPos, characterBox.position);

      if (distance < 1) return stop();

      characterBox.locallyTranslate(
        new Vector3(0, 0, characterSpeed * deltaTime)
      );
    }
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });

  await scene.whenReadyAsync();

  return scene;
}
