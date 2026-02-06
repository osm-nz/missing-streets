import { it, describe, expect } from "vitest";
import { getNameCode } from "../geo";

describe(getNameCode, () => {
  it.each`
    input                 | output
    ${"Bob Road"}         | ${"bobroad"}
    ${"Kāwerau No.2 Ave"} | ${"kāwerauno2ave"}
  `("converts $input to $output", ({ input, output }) => {
    expect(getNameCode(input)).toBe(output);
  });
});
