import { it, describe, expect } from "vitest";
import { getDeleteVariants } from "../conflate";

describe(getDeleteVariants, () => {
  it("returns every string with up to 2 characters deleted", () => {
    expect([...getDeleteVariants("abcd")].toSorted()).toStrictEqual(
      [
        // 0 deletions:
        "abcd",
        // 1 deletion:
        "bcd",
        "acd",
        "abd",
        "abc",
        // 2 deletions:
        "cd",
        "bd",
        "bc",
        "ad",
        "ac",
        "ab",
      ].toSorted()
    );
  });

  it("handles short strings", () => {
    expect([...getDeleteVariants("")]).toStrictEqual([""]);
    expect([...getDeleteVariants("a")]).toStrictEqual(["a", ""]);
  });
});
