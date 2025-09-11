const colors = {
  redBright: '\x1b[91m',
  yellowBright: '\x1b[93m',
  blueBright: '\x1b[94m',
  greenBright: '\x1b[92m',
  cyanBright: '\x1b[96m',
  reset: '\x1b[0m', // Reset color
};

// Utility function to style text
const styleText = (color: keyof typeof colors, text: string): string => {
  return `${colors[color]}${text}${colors.reset}`;
};

// Exported log levels
export const DONE = styleText('greenBright', '[DONE]');
export const INFO = styleText('cyanBright', '[INFO]');
export const SKIP = styleText('yellowBright', '[SKIP]');
export const OK = styleText('greenBright', '[OK]');
export const WARN = styleText('yellowBright', '[WARN]');
export const ERR = styleText('redBright', '[ERR]');
