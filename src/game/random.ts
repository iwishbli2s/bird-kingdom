// 독립적인 작은 PRNG. 같은 턴의 seed는 StrictMode 재평가에서도 같은 난수열을 만듭니다.
export function createRandomSeed(): number {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
