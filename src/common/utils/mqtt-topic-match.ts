export function mqttTopicMatch(
  pattern: string,
  topic: string,
): boolean {
  const patternParts = pattern.split('/');
  const topicParts = topic.split('/');

  for (let i = 0; i < patternParts.length; i++) {
    const currentPattern = patternParts[i];
    const currentTopic = topicParts[i];

    // Multi-level wildcard
    if (currentPattern === '#') {
      return true;
    }

    // Single-level wildcard
    if (currentPattern === '+') {
      continue;
    }

    // Exact match required
    if (currentPattern !== currentTopic) {
      return false;
    }
  }

  return patternParts.length === topicParts.length;
}