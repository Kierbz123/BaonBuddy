export function generateId(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  let generated = arr[0];
  
  if (!Number.isSafeInteger(generated)) {
    console.warn("Generated ID is not a safe integer, applying fallback.");
    generated = Date.now() + Math.floor(Math.random() * 1000);
  }
  
  return generated;
}
