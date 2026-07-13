export async function withTimeout(
  promise: Promise<any>,

  timeout: number,
) {
  return Promise.race([
    promise,

    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Tool timeout")),

        timeout,
      ),
    ),
  ]);
}
