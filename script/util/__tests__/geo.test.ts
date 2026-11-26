import { it, describe, expect } from "vitest";
import { getNameCode, isWithinTwoEdits } from "../geo";

describe(getNameCode, () => {
  it.each`
    input                 | output
    ${"Bob Road"}         | ${"bobroad"}
    ${"Kāwerau No.2 Ave"} | ${"kāwerauno2ave"}
    ${"KĀWERAU AVE"}      | ${"kāwerauave"}
    ${"Sràid an Eòrna"}   | ${"sraidaneorna"}
    ${"Lôn Meirion"}      | ${"lonmeirion"}
    ${"Ffordd Tŷ Gwyn"}   | ${"fforddtygwyn"}
  `("converts $input to $output", ({ input, output }) => {
    expect(getNameCode(input)).toBe(output);
  });
});

describe(isWithinTwoEdits, () => {
  it.each([
    ["road", "road", true],
    ["road", "rood", true],
    ["road", "rd", true],
    ["road", "roads", true],
    ["road", "roasd", true],
    ["road", "street", false],
    ["rd", "street", false],
  ])("compares %s and %s", (a, b, expected) => {
    expect(isWithinTwoEdits(a, b)).toBe(expected);
  });
});
