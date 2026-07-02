export function parsePsaTopic(topic: string): string | null {
  const prefix = "data/psa/O2generatorMGM/";
  if (!topic.startsWith(prefix)) return null;
  const serialNumber = topic.slice(prefix.length);
  return serialNumber || null;
}
