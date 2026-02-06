import { describe, expect, it } from "vitest";
import { normaliseStreetName } from "../normaliseStreetName";

describe(normaliseStreetName, () => {
  it.each`
    input                     | output
    ${"CAPITOL ROAD"}         | ${"Capitol Road"}
    ${"HYPHENATED-MAIN ROAD"} | ${"Hyphenated-main Road"}
    ${"W 31ST ST S"}          | ${"West 31st Street South"}
    ${"St Johns St S"}        | ${"Street Johns Street South" /* TODO: fix this */}
    ${"S St Johns St"}        | ${"South Street Johns Street" /* TODO: fix this */}
  `("converts $input to $output", ({ input, output }) => {
    expect(normaliseStreetName(input, true)).toBe(output);
  });
});
