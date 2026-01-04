interface BinaryData {
  classType: number;  // 0 = OBJECT, 1 = PERSON
  direction: number;  // 0 = LEFT, 1 = FRONT, 2 = RIGHT
  confidence: number; // 0-100
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
  const { classType, direction, confidence } = raw;

  console.log(`📊 parseEvent received: classType=${classType}, direction=${direction}`);

  // Filter out low confidence detections (lower threshold for testing)
  if (confidence < 30) {
    console.log(`⚠️ Confidence too low: ${confidence}% < 30%`);
    return null;
  }

  const object = CLASS_MAP[classType] || "Unknown";
  const directionName = DIRECTION_MAP[direction] || "unknown";

  const result = {
    object,
    direction: directionName,
  };
  
  console.log(`✅ Event parsed:`, result);
  return result;
}

export function buildSentence(e: any) {
  const sentence = `${e.object} on your ${e.direction}`;
  console.log(`📣 Sentence built:`, sentence);
  return sentence;
}