import { it, describe, expect } from "vitest";
import { DisjointSet } from "../DisjointSet";

describe(DisjointSet, () => {
  it("groups items that share keys", () => {
    // x---(A)---y---(C)---w---(D)---?
    // ?---(Z)---z---(F)---?
    const set = new DisjointSet<string>();
    set.add("A", ["x", "y"]);
    set.add("B", ["z"]);
    set.add("C", ["y", "w"]);
    set.add("D", ["w"]);
    set.add("E", []);
    set.add("F", ["z"]);

    expect(set.size).toBe(6);
    expect(set.dump()).toStrictEqual([["A", "C", "D"], ["B", "F"], ["E"]]);
  });
});
