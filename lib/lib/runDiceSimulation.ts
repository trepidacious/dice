import RAPIER from "@dimforge/rapier3d-compat";
import { Vector3 } from "three";

import { toQuaternion } from "./rapierToThree";
import Rando from "./rando";
import range from "./range";
import rapierInit from "./rapierInit";
const tableFriction = 0.2; //10
const diceFriction = 0.001; //1
const speedRange = 3;

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
  r: Rando
) => {
  const cols = Math.ceil(Math.sqrt(count));

  const x = index % cols;
  const y = Math.floor(index / cols);

  // Create a dynamic rigid-body.
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(
      (x - (cols - 1) / 2) * 0.4 + r.nextSymRange(0.05),
      0.6,
      (y - (cols - 1) / 2) * 0.4 + r.nextSymRange(0.05)
    )
    .setLinvel(
      r.nextSymRange(speedRange),
      1 + r.next() * 2,
      r.nextSymRange(speedRange)
    )
    .setRotation(randomQuaternion(r))
    .setAngvel({
      x: r.nextSymRange(spin),
      y: r.nextSymRange(spin),
      z: r.nextSymRange(spin),
    });
  const rigidBody = world.createRigidBody(rigidBodyDesc);

  // Create a cuboid collider attached to the dynamic rigidBody.
  const halfSize = size / 2;
  const colliderDesc = RAPIER.ColliderDesc.cuboid(halfSize, halfSize, halfSize)
    .setFriction(diceFriction)
    .setRestitution(0.0);
  world.createCollider(colliderDesc, rigidBody);

  return rigidBody;
};

const boundaryThickness = 0.3;

const addBoundaries = (world: RAPIER.World) => {
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(20.0, 1, 20.0)
    .setTranslation(0, -1, 0)
    .setFriction(tableFriction);
  world.createCollider(groundColliderDesc);

  const wall1ColliderDesc = RAPIER.ColliderDesc.cuboid(
    boundaryThickness,
    20,
    20.0
  )
    .setTranslation(1, -1, 0)
    .setFriction(0);
  world.createCollider(wall1ColliderDesc);

  const wall2ColliderDesc = RAPIER.ColliderDesc.cuboid(
    boundaryThickness,
    20,
    20.0
  )
    .setTranslation(-1, -1, 0)
    .setFriction(0);
  world.createCollider(wall2ColliderDesc);

  const wall3ColliderDesc = RAPIER.ColliderDesc.cuboid(
    20,
    20,
    boundaryThickness
  )
    .setTranslation(0, -1, 1)
    .setFriction(0);
  world.createCollider(wall3ColliderDesc);

  const wall4ColliderDesc = RAPIER.ColliderDesc.cuboid(
    20,
    20,
    boundaryThickness
  )
    .setTranslation(0, -1, -1)
    .setFriction(0);
  world.createCollider(wall4ColliderDesc);
};

export type DiceWorld = {
  world: RAPIER.World;
  diceBodies: RAPIER.RigidBody[];
};

const createDiceWorld = (
  size: number,
  count: number,
  seed: number
): DiceWorld => {
  const r = new Rando(seed);

  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  const world = new RAPIER.World(gravity);

  addBoundaries(world);

  const diceBodies = range(count).map((i) => addDice(world, i, count, size, r));

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

const setFaceVector = (v: Vector3, i: number) => {
  if (i === 0) {
    v.set(0, 0, 1);
  } else if (i === 1) {
    v.set(0, -1, 0);
  } else if (i === 2) {
    v.set(1, 0, 0);
  } else if (i === 3) {
    v.set(-1, 0, 0);
  } else if (i === 4) {
    v.set(0, 1, 0);
  } else if (i === 5) {
    v.set(0, 0, -1);
  }
};

const runDiceSimulation = async (
  size: number,
  count: number,
  seed: number,
  maxTicks: number
): Promise<DiceSimulation> => {
  await rapierInit();

  const start = performance.now();

  const { world, diceBodies } = createDiceWorld(size, count, seed);

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
  const faceVector = new Vector3();
  for (let dieIndex = 0; dieIndex < count; dieIndex++) {
    const diceBody = diceBodies[dieIndex];
    const rotation = diceBody.rotation();
    const diceHistory = diceHistories[dieIndex];
    const quaternion = toQuaternion(rotation);

    let maxY = -10;
    let directionUp = 0;
    for (let directionIndex = 0; directionIndex < 6; directionIndex++) {
      setFaceVector(faceVector, directionIndex);
      faceVector.applyQuaternion(quaternion);
      if (faceVector.y > maxY) {
        maxY = faceVector.y;
        directionUp = directionIndex;
      }
    }
    diceHistory.faceUpIndex = directionUp;
  }

  // Free world - this should free all associated objects
  // If we used an EventQueue in `world.step` we would also need to free that
  world.free();

  return { size, count, seed, ticks: tick, simTime, diceHistories };
};

export { runDiceSimulation, setFaceVector };
