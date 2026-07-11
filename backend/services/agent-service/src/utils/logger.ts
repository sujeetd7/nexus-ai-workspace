export class Logger {
  static info(message: string, meta?: unknown) {
    console.log(`[INFO] ${message}`, meta ?? "");
  }

  static warn(message: string, meta?: unknown) {
    console.warn(`[WARN] ${message}`, meta ?? "");
  }

  static error(message: string, meta?: unknown) {
    console.error(`[ERROR] ${message}`, meta ?? "");
  }

  static debug(message: string, meta?: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[DEBUG] ${message}`, meta ?? "");
    }
  }
}
