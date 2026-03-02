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
    const clonedDate = new Date(value.getTime());
    seen.set(value, clonedDate);
    return clonedDate as T;
  }

  if (value instanceof RegExp) {
    const clonedRegExp = new RegExp(value.source, value.flags);
    clonedRegExp.lastIndex = value.lastIndex;
    seen.set(value, clonedRegExp);
    return clonedRegExp as T;
  }

  if (value instanceof ArrayBuffer) {
    const clonedBuffer = value.slice(0);
    seen.set(value, clonedBuffer);
    return clonedBuffer as T;
  }

  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView) {
      const clonedBuffer = deepCloneInternal(value.buffer, seen);
      const clonedDataView = new DataView(
        clonedBuffer,
        value.byteOffset,
        value.byteLength,
      );
      seen.set(value, clonedDataView);
      return clonedDataView as T;
    }

    const TypedArrayConstructor = value.constructor as {
      new (
        buffer: ArrayBufferLike,
        byteOffset?: number,
        length?: number,
      ): unknown;
    };
    const clonedBuffer = deepCloneInternal(value.buffer, seen);
    const length =
      "length" in value ? (value as { length: number }).length : undefined;
    const clonedTypedArray = new TypedArrayConstructor(
      clonedBuffer,
      value.byteOffset,
      length,
    );
    seen.set(value, clonedTypedArray);
    return clonedTypedArray as T;
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
    ? (() => {
        const clonedArray: unknown[] = [];
        clonedArray.length = (value as unknown[]).length;
        return clonedArray;
      })()
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
