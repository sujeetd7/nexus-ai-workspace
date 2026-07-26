export async function loggerMiddleware(req: any, reply: any) {
  const start = Date.now();

  reply.raw.on("finish", () => {
    console.log({
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      status: reply.statusCode,
      duration: `${Date.now() - start}ms`,
    });
  });
}
