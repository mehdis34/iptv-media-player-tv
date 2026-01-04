const namePrefixes = [
  'Nova',
  'Cosmo',
  'Atlas',
  'Lumen',
  'Orion',
  'Pixel',
  'Cinema',
  'Aura',
  'Vega',
  'Nexus',
];

const nameSuffixes = [
  'Stream',
  'Prime',
  'Vault',
  'Wave',
  'Pulse',
  'Zone',
  'Studio',
  'Deck',
  'Hub',
  'Core',
];

const randomItem = <T,>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)];

export const createRandomProfileName = () => {
  const prefix = randomItem(namePrefixes);
  const suffix = randomItem(nameSuffixes);
  return `${prefix} ${suffix}`;
};

export const createAvatarSeed = () =>
  Math.random().toString(36).slice(2, 10);

export const getAvatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(
    seed,
  )}`;
