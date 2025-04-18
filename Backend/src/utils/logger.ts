const info = (...params: any[]): void => {
  if (process.env.NODE_ENV !== "test") {
    console.log(...params);
  }
};

const err = (...params: any[]): void => {
  if (process.env.NODE_ENV !== "test") {
    console.error(...params);
  }
};

const logger = {
  info,
  err,
};

export default logger;
