interface BinaryData {
  classType: number;  // 0 = OBJECT, 1 = PERSON
  direction: number;  // 0 = LEFT, 1 = FRONT, 2 = RIGHT
}

const CLASS_MAP: Record<number, string> = {
  0: "Object",
  1: "Person",
};

const DIRECTION_MAP: Record<number, string> = {
  0: "left",
  1: "center",
  2: "right",
};

export function parseEvent(raw: BinaryData) {
  const { classType, direction } = raw;

  console.log(`📊 parseEvent received: classType=${classType}, direction=${direction}`);

  const object = CLASS_MAP[classType] || "Unknown";
  const directionName = DIRECTION_MAP[direction] || "unknown";

  const result = {
    object,
    direction: directionName,
    distance: "detected",
  };
  
  console.log(`✅ Event parsed:`, result);
  return result;
}

export function buildSentence(e: any) {
  const sentence = `${e.object} on your ${e.direction}, ${e.distance}`;
  console.log(`📣 Sentence built:`, sentence);
  return sentence;
}
