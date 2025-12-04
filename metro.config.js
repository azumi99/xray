const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Windows-specific optimizations
config.maxWorkers = 1; // Reduce CPU load on Windows
config.resetCache = true; // Always reset cache
config.watchFolders = [__dirname]; // Limit watched folders

// Increase timeouts for Windows
config.server = {
  ...config.server,
  port: 8091,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Increase timeout for Windows
      req.socket.setTimeout(60 * 1000);
      middleware(req, res, next);
    };
  },
};

module.exports = config;