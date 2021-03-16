var appRoot = require('app-root-path');
var winston = require('winston');
require('winston-daily-rotate-file');

// define the custom settings for each transport (file, console)
var options = {
  file: {
    level: 'info',
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    json: true,
    handleExceptions: true,
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '100d'
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

// instantiate a new Winston Logger with the settings defined above
var logger = winston.createLogger({
  transports: [
    new winston.transports.DailyRotateFile(options.file),
    new winston.transports.Console(options.console)
  ],
  exitOnError: false, // do not exit on handled exceptions
});

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function(message, encoding) {
    // use the 'info' log level so the output will be picked up by both transports (file and console)
    logger.info(message);
  },
};

module.exports = logger;