import { Suspense, useState } from "react";
import { DiceRoller } from "../lib/components/DiceRoller/DiceRoller";

function App() {
  const [seed, setSeed] = useState(1);
  return (
    <>
      <h1 style={{ fontFamily: "sans-serif", color: "wheat" }}>Dice</h1>
      <div
        style={{
          width: 600,
          height: 600,
          background: "#2e262e",
          border: "1px solid bisque",
        }}
      >
        <Suspense fallback={null}>
          <DiceRoller
            size={0.1}
            halfWidth={1}
            halfHeight={1}
            diceTypes={[
              "D4",
              "D6",
              "D8",
              "D10",
              "D10x10",
              "D12",
              "D20",
              "D4",
              "D6",
              "D8",
              "D10",
              "D10x10",
              "D12",
              "D20",
            ]}
            dieVariants={[
              "Advantage",
              "Advantage",
              "Advantage",
              "Advantage",
              "Advantage",
              "Advantage",
              "Advantage",

              "Disadvantage",
              "Disadvantage",
              "Disadvantage",
              "Disadvantage",
              "Disadvantage",
              "Disadvantage",
              "Disadvantage",
            ]}
            seed={seed}
            desiredRolls={[1, 2, 3, 4, 50, 6, 7, 4, 6, 8, 9, 90, 12, 20]}
            shadowColor="#000000"
            shadowOpacity={0.2}
          />
        </Suspense>
      </div>
      <button onClick={() => setSeed((seed) => seed + 1)}>New roll</button>
    </>
  );
}

export default App;
