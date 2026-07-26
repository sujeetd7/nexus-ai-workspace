const LEVELS = ["error", "warn", "info", "debug"] as const;
type Level = (typeof LEVELS)[number];

const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase() as Level;
const currentLevelIndex = Math.max(0, LEVELS.indexOf(envLevel));

function shouldLog(level: Level) {
  return LEVELS.indexOf(level) <= currentLevelIndex;
}

export const logger = {
  error: (...args: any[]) => {
    if (shouldLog("error")) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (shouldLog("warn")) console.warn(...args);
  },
  info: (...args: any[]) => {
    if (shouldLog("info")) console.log(...args);
  },
  debug: (...args: any[]) => {
    if (shouldLog("debug")) console.debug(...args);
  },
};

export default logger;
