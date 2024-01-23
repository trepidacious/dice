import { Suspense, useState } from "react";
import { Dice } from "../lib/components/Dice/Dice";
import range from "../lib/lib/range";
// import { DiceAlignment } from "../lib/components/DiceAlignment";

function App() {
  const [seed, setSeed] = useState(1);
  return (
    <>
      <h1 style={{ fontFamily: "sans-serif", color: "wheat" }}>Dice</h1>
      <div style={{ width: 600, height: 600, background: "#2e262e" }}>
        <Suspense fallback={null}>
          <Dice
            size={0.1}
            // diceTypes={["D20", "D6", "D10", "D6", "D6", "D6"]}
            diceTypes={["D10x10", "D10"]}
            // diceTypes={range(20).map(() => "D20")}
            gildedCount={0}
            seed={seed}
            disadvantage={true}
            // desiredRolls={[20, 10, 4, 6, 6, 6]}
            desiredRolls={[40, 2]}
            // desiredRolls={range(20).map((i) => i + 1)}
            // desiredRolls={range(20).map(() => 20)}
          />
          {/* <DiceAlignment /> */}
        </Suspense>
      </div>
      <button onClick={() => setSeed((seed) => seed + 1)}>New roll</button>
    </>
  );
}

export default App;
// 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
// 6, 2, 8, 0, 4, 5, 9, 1, 7, 3
