export async function retry<T>(
  fn: () => Promise<T>,

  attempts = 3,
) {
  let error;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      error = e;
    }
  }

  throw error;
}
