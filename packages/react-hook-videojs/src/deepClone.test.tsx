import { expect, test } from "vitest";
import deepClone from "./deepClone";

test("returns primitive values as-is", () => {
  expect(deepClone("text")).toBe("text");
  expect(deepClone(42)).toBe(42);
  expect(deepClone(true)).toBe(true);
  expect(deepClone(null)).toBeNull();
  expect(deepClone(undefined)).toBeUndefined();
});

test("deep clones arrays", () => {
  const source = [{ id: 1 }, [2, 3], "x"];
  const cloned = deepClone(source);

  expect(cloned).toEqual(source);
  expect(cloned).not.toBe(source);
  expect(cloned[0]).not.toBe(source[0]);
  expect(cloned[1]).not.toBe(source[1]);
});

test("clones Date instances", () => {
  const source = new Date("2026-03-02T00:00:00.000Z");
  const cloned = deepClone(source);

  expect(cloned).toEqual(source);
  expect(cloned).not.toBe(source);
  expect(cloned.getTime()).toBe(source.getTime());
});

test("clones RegExp instances", () => {
  const source = /video.js/gi;
  const cloned = deepClone(source);

  expect(cloned).toEqual(source);
  expect(cloned).not.toBe(source);
  expect(cloned.source).toBe(source.source);
  expect(cloned.flags).toBe(source.flags);
});

test("clones objects and keeps prototype", () => {
  class Source {
    name: string;

    constructor(name: string) {
      this.name = name;
    }
  }

  const source = new Source("player");
  const cloned = deepClone(source);

  expect(cloned).toEqual(source);
  expect(cloned).not.toBe(source);
  expect(Object.getPrototypeOf(cloned)).toBe(Source.prototype);
});

test("clones circular objects", () => {
  const source = { name: "root" } as {
    name: string;
    self?: unknown;
  };
  source.self = source;

  const cloned = deepClone(source);

  expect(cloned).not.toBe(source);
  expect(cloned.name).toBe("root");
  expect(cloned.self).toBe(cloned);
});

test("keeps shared references shared", () => {
  const child = { id: 1 };
  const source = { left: child, right: child };

  const cloned = deepClone(source);

  expect(cloned.left).not.toBe(child);
  expect(cloned.left).toBe(cloned.right);
});

test("clones Map and Set entries", () => {
  const mapKey = { id: "key" };
  const mapValue = { id: "value" };
  const setValue = { id: "set" };
  const source = {
    map: new Map([[mapKey, mapValue]]),
    set: new Set([setValue]),
  };

  const cloned = deepClone(source);

  expect(cloned.map).not.toBe(source.map);
  expect(cloned.set).not.toBe(source.set);
  expect(cloned.map.size).toBe(1);
  expect(cloned.set.size).toBe(1);

  const [clonedKey] = cloned.map.keys();
  const [clonedMapValue] = cloned.map.values();
  const [clonedSetValue] = cloned.set.values();

  expect(clonedKey).toEqual(mapKey);
  expect(clonedMapValue).toEqual(mapValue);
  expect(clonedSetValue).toEqual(setValue);
  expect(clonedKey).not.toBe(mapKey);
  expect(clonedMapValue).not.toBe(mapValue);
  expect(clonedSetValue).not.toBe(setValue);
});

test("clones ArrayBuffer and typed array views", () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const source = {
    bytes,
    dataView: new DataView(bytes.buffer),
    buffer: bytes.buffer,
  };

  const cloned = deepClone(source);

  expect(cloned.bytes).not.toBe(source.bytes);
  expect(cloned.bytes).toEqual(source.bytes);
  expect(cloned.dataView).not.toBe(source.dataView);
  expect(cloned.dataView.buffer).not.toBe(source.dataView.buffer);
  expect(cloned.buffer).not.toBe(source.buffer);
  expect(new Uint8Array(cloned.buffer)).toEqual(new Uint8Array(source.buffer));
});

test("clones symbol and non-enumerable properties", () => {
  const symbolKey = Symbol("meta");
  const source = { visible: { id: 1 } } as {
    visible: { id: number };
    [key: symbol]: unknown;
  };

  Object.defineProperty(source, "hidden", {
    enumerable: false,
    configurable: true,
    writable: true,
    value: { secret: true },
  });
  source[symbolKey] = { symbolValue: true };

  const cloned = deepClone(source) as {
    visible: { id: number };
    hidden: { secret: boolean };
    [key: symbol]: unknown;
  };

  expect(cloned).not.toBe(source);
  expect(cloned.visible).not.toBe(source.visible);
  expect(cloned.hidden).toEqual({ secret: true });
  expect(cloned.hidden).not.toBe(
    (source as { hidden: { secret: boolean } }).hidden,
  );

  const descriptor = Object.getOwnPropertyDescriptor(cloned, "hidden");
  expect(descriptor?.enumerable).toBe(false);

  expect(cloned[symbolKey]).toEqual({ symbolValue: true });
  expect(cloned[symbolKey]).not.toBe(source[symbolKey]);
});

test("preserves accessor descriptors", () => {
  const source = {} as { value: number };
  Object.defineProperty(source, "value", {
    enumerable: true,
    configurable: true,
    get() {
      return 7;
    },
  });

  const cloned = deepClone(source);
  const descriptor = Object.getOwnPropertyDescriptor(cloned, "value");

  expect(descriptor?.get).toBeDefined();
  expect(descriptor?.set).toBeUndefined();
  expect(cloned.value).toBe(7);
});

test("ignores keys without descriptors", () => {
  const source = new Proxy(
    {},
    {
      ownKeys: () => ["ghost"],
      getOwnPropertyDescriptor: () => undefined,
    },
  );

  const cloned = deepClone(source as Record<string, unknown>);

  expect(cloned).toEqual({});
  expect(Object.prototype.hasOwnProperty.call(cloned, "ghost")).toBe(false);
});

test("preserves DOM nodes used by video.js options", () => {
  const element = document.createElement("div");
  const source = {
    el: element,
    restoreEl: element,
    sources: [{ src: "fixture.mp4", type: "video/mp4" }],
  };

  const cloned = deepClone(source);

  expect(cloned).not.toBe(source);
  expect(cloned.el).toBe(element);
  expect(cloned.restoreEl).toBe(element);
  expect(cloned.sources).toEqual(source.sources);
  expect(cloned.sources).not.toBe(source.sources);
  expect(cloned.sources[0]).not.toBe(source.sources[0]);
});
