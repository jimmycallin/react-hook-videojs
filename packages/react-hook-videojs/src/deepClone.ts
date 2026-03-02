const cloneWithDescriptor = (
  descriptor: PropertyDescriptor,
  cloneValue: (input: unknown) => unknown,
): PropertyDescriptor => {
  if (!("value" in descriptor)) {
    return descriptor;
  }

  return {
    ...descriptor,
    value: cloneValue(descriptor.value),
  };
};

const deepCloneInternal = <T>(value: T, seen: WeakMap<object, unknown>): T => {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (typeof Node !== "undefined" && value instanceof Node) {
    return value;
  }

  const cached = seen.get(value as object);
  if (cached) {
    return cached as T;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T;
  }

  if (value instanceof ArrayBuffer) {
    return value.slice(0) as T;
  }

  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView) {
      const clonedBuffer = deepCloneInternal(value.buffer, seen);
      return new DataView(
        clonedBuffer,
        value.byteOffset,
        value.byteLength,
      ) as T;
    }

    const TypedArrayConstructor = value.constructor as {
      new (typedArray: ArrayBufferView): unknown;
    };
    return new TypedArrayConstructor(value) as T;
  }

  if (value instanceof Map) {
    const clonedMap = new Map<unknown, unknown>();
    seen.set(value, clonedMap);

    for (const [key, mapValue] of value.entries()) {
      clonedMap.set(
        deepCloneInternal(key, seen),
        deepCloneInternal(mapValue, seen),
      );
    }

    return clonedMap as T;
  }

  if (value instanceof Set) {
    const clonedSet = new Set<unknown>();
    seen.set(value, clonedSet);

    for (const setValue of value.values()) {
      clonedSet.add(deepCloneInternal(setValue, seen));
    }

    return clonedSet as T;
  }

  const clonedObject = Array.isArray(value)
    ? new Array((value as unknown[]).length)
    : Object.create(Object.getPrototypeOf(value));

  seen.set(value as object, clonedObject);

  for (const key of Reflect.ownKeys(value as object)) {
    if (Array.isArray(value) && key === "length") {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(value as object, key);
    if (!descriptor) {
      continue;
    }

    Object.defineProperty(
      clonedObject,
      key,
      cloneWithDescriptor(descriptor, (input) =>
        deepCloneInternal(input, seen),
      ),
    );
  }

  return clonedObject as T;
};

const deepClone = <T>(value: T): T => deepCloneInternal(value, new WeakMap());

export default deepClone;
