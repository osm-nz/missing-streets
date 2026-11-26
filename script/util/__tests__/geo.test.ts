import { it, describe, expect } from "vitest";
import { getNameCode, isWithinEditDistance } from "../geo";

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

describe(isWithinEditDistance, () => {
  it.each([
    ["road", "road", 2, true],
    ["road", "rood", 2, true],
    ["road", "rd", 2, true],
    ["road", "roads", 2, true],
    ["road", "roasd", 2, true],
    ["road", "street", 2, false],
    ["rd", "street", 2, false],
    ["road", "rood", 1, true],
    ["road", "rd", 1, false],
    ["road", "rods", 1, false],
  ])("compares %s and %s with max %i edits", (a, b, maxEdits, expected) => {
    expect(isWithinEditDistance(a, b, maxEdits)).toBe(expected);
  });
});
