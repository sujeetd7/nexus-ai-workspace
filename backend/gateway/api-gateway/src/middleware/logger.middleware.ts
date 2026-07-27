export async function loggerMiddleware(req: any, reply: any): Promise<void> {
  req.log.info(
    {
      requestId: req.requestId,
      correlationId: req.correlationId,
      method: req.method,
      url: req.url,
      status: reply.statusCode,
    },
    "request completed",
  );
}
