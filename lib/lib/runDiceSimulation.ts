import RAPIER from "@dimforge/rapier3d-compat";

import { toQuaternion } from "./rapierToThree";
import Rando from "./rando";
import range from "./range";
import rapierInit from "./rapierInit";
import { diceSetInfo, rotationToFaceUpIndex } from "./polyhedra";
import { DiceType } from "..";

const boundaryRestitution = 0.5;
const tableRestitution = 0.2;
const diceRestitution = 0.2;

const tableFriction = 0.2;
const diceFriction = 0.04;
const speedRange = 2;
const velocityX = 0;
const velocityZ = 0;

const initialSpacing = 1.2;

const randomQuaternion = (r: Rando): RAPIER.Rotation => {
  // Derived from http://planning.cs.uiuc.edu/node198.html
  const u1 = r.next();
  const sqrt1u1 = Math.sqrt(1 - u1);
  const sqrtu1 = Math.sqrt(u1);

  const u2 = 2 * Math.PI * r.next();

  const u3 = 2 * Math.PI * r.next();

  return {
    x: sqrt1u1 * Math.cos(u2),
    y: sqrtu1 * Math.sin(u3),
    z: sqrtu1 * Math.cos(u3),
    w: sqrt1u1 * Math.sin(u2),
  };
};

const spin = 30;

const addDice = (
  world: RAPIER.World,
  index: number,
  count: number,
  size: number,
  type: DiceType,
  r: Rando
) => {
  const cols = Math.ceil(Math.sqrt(count));

  const x = index % cols;
  const y = Math.floor(index / cols);

  // Create a dynamic rigid-body,
  // positioned in a grid by index, with randomised rotation,
  // linear and angular velocity
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(
      (x - (cols - 1) / 2) * initialSpacing * size + r.nextSymRange(0.05),
      0.6,
      (y - (cols - 1) / 2) * initialSpacing * size + r.nextSymRange(0.05)
    )
    .setLinvel(
      r.nextSymRange(speedRange) + velocityX,
      1 + r.next() * 2,
      r.nextSymRange(speedRange) + velocityZ
    )
    .setRotation(randomQuaternion(r))
    .setAngvel({
      x: r.nextSymRange(spin),
      y: r.nextSymRange(spin),
      z: r.nextSymRange(spin),
    });
  const rigidBody = world.createRigidBody(rigidBodyDesc);

  //Create a collider based on dice type
  const colliderDesc = diceSetInfo[type].colliderDescFromSize(size);
  colliderDesc.setFriction(diceFriction).setRestitution(diceRestitution);

  world.createCollider(colliderDesc, rigidBody);

  return rigidBody;
};

const addBoundaries = (
  world: RAPIER.World,
  size: number,
  halfWidth: number,
  halfHeight: number
) => {
  const tableColliderDesc = RAPIER.ColliderDesc.cuboid(
    20.0 * halfWidth,
    1,
    20.0 * halfHeight
  )
    .setTranslation(0, -1, 0)
    .setRestitution(tableRestitution)
    .setFriction(tableFriction);
  world.createCollider(tableColliderDesc);

  const boundaryThickness = size * 2.75;

  const wall1ColliderDesc = RAPIER.ColliderDesc.cuboid(
    boundaryThickness,
    20,
    20.0
  )
    .setTranslation(halfWidth, -1, 0)
    .setRestitution(boundaryRestitution)
    .setFriction(0);
  world.createCollider(wall1ColliderDesc);

  const wall2ColliderDesc = RAPIER.ColliderDesc.cuboid(
    boundaryThickness,
    20,
    20.0
  )
    .setTranslation(-halfWidth, -1, 0)
    .setRestitution(boundaryRestitution)
    .setFriction(0);
  world.createCollider(wall2ColliderDesc);

  const wall3ColliderDesc = RAPIER.ColliderDesc.cuboid(
    20,
    20,
    boundaryThickness
  )
    .setTranslation(0, -1, halfHeight)
    .setRestitution(boundaryRestitution)
    .setFriction(0);
  world.createCollider(wall3ColliderDesc);

  const wall4ColliderDesc = RAPIER.ColliderDesc.cuboid(
    20,
    20,
    boundaryThickness
  )
    .setTranslation(0, -1, -halfHeight)
    .setRestitution(boundaryRestitution)
    .setFriction(0);
  world.createCollider(wall4ColliderDesc);
};

export type DiceWorld = {
  world: RAPIER.World;
  diceBodies: RAPIER.RigidBody[];
};

const createDiceWorld = (
  size: number,
  halfWidth: number,
  halfHeight: number,
  diceTypes: DiceType[],
  seed: number
): DiceWorld => {
  const r = new Rando(seed);

  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  const world = new RAPIER.World(gravity);

  addBoundaries(world, size, halfWidth, halfHeight);

  const diceBodies = diceTypes.map((type, i) =>
    addDice(world, i, diceTypes.length, size, type, r)
  );

  return { world, diceBodies };
};

export type DiceHistory = {
  positions: RAPIER.Vector[];
  rotations: RAPIER.Rotation[];
  faceUpIndex: number;
};

export type DiceSimulation = {
  size: number;
  count: number;
  seed: number;
  ticks: number;
  simTime: number;
  diceHistories: DiceHistory[];
};

const runDiceSimulation = async (
  size: number,
  halfWidth: number,
  halfHeight: number,
  diceTypes: DiceType[],
  seed: number,
  maxTicks: number
): Promise<DiceSimulation> => {
  await rapierInit();

  const start = performance.now();

  const count = diceTypes.length;

  const { world, diceBodies } = createDiceWorld(
    size,
    halfWidth,
    halfHeight,
    diceTypes,
    seed
  );

  const diceHistories = range(count).map(() => {
    const positions = new Array<RAPIER.Vector>(maxTicks);
    const rotations = new Array<RAPIER.Rotation>(maxTicks);
    return { positions, rotations, faceUpIndex: 0 };
  });

  let tick = 0;
  while (tick < maxTicks && diceBodies.find((db) => !db.isSleeping())) {
    world.step();
    for (let dieIndex = 0; dieIndex < count; dieIndex++) {
      const diceBody = diceBodies[dieIndex];
      const position = diceBody.translation();
      const rotation = diceBody.rotation();
      const diceHistory = diceHistories[dieIndex];
      diceHistory.positions[tick] = position;
      diceHistory.rotations[tick] = rotation;
    }
    tick++;
  }

  const simTime = performance.now() - start;

  // Find final dice orientations
  for (let dieIndex = 0; dieIndex < count; dieIndex++) {
    const diceType = diceTypes[dieIndex];
    const diceBody = diceBodies[dieIndex];
    const rotation = diceBody.rotation();
    const diceHistory = diceHistories[dieIndex];
    const quaternion = toQuaternion(rotation);

    diceHistory.faceUpIndex = rotationToFaceUpIndex(diceType, quaternion);
  }

  // Free world - this should free all associated objects
  // If we used an EventQueue in `world.step` we would also need to free that
  world.free();

  return { size, count, seed, ticks: tick, simTime, diceHistories };
};

export { runDiceSimulation };
