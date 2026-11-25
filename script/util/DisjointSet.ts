/**
 * Implementation of https://en.wikipedia.org/wiki/Disjoint-set_data_structure
 *
 * Groups `items` if they share a key. E.g. if A & B share a key,
 * and B & C share a different key, then then A, B, and C all end up
 * in the same group.
 */
export class DisjointSet<T> {
  #items: T[] = [];

  #parent: number[] = [];

  /** the first item seen with each key */
  #keys: Record<string, number> | undefined = {};

  get size() {
    return this.#items.length;
  }

  #find(index: number): number {
    const parent = this.#parent;
    let root = index;
    while (parent[root] !== root) {
      parent[root] = parent[parent[root]];
      root = parent[root];
    }
    return root;
  }

  add(item: T, keys: string[]) {
    if (!this.#keys) throw new ReferenceError("already disposed");
    const index = this.#items.length;
    this.#items.push(item);
    this.#parent.push(index);

    for (const key of keys) {
      const other = this.#keys[key];
      if (other === undefined) {
        this.#keys[key] = index;
      } else {
        this.#parent[this.#find(index)] = this.#find(other);
      }
    }
  }

  /** returns the groupings, and then clears the internal state */
  dump(): T[][] {
    this.#keys = undefined;

    const groups: Record<number, T[]> = {};
    for (const [index, item] of this.#items.entries()) {
      const root = this.#find(index);
      groups[root] ||= [];
      groups[root].push(item);
    }
    return Object.values(groups);
  }
}
