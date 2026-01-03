export function parseEvent(raw: string) {
  const [object, direction, distance, confidence] = raw.split(",");

  if (Number(confidence) < 60) return null;

  return { object, direction, distance };
}

export function buildSentence(e: any) {
  return `${capitalize(e.object)} on your ${e.direction}, ${e.distance}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
