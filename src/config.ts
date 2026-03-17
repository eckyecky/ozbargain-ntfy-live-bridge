const getEnv = (name: string, defaultValue?: string): string => {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Environment variable ${name} is required.`);
  }
  return value;
};

export const config = {
  NTFY_TOPIC: getEnv('NTFY_TOPIC'),
  NTFY_SERVER: getEnv('NTFY_SERVER', 'https://ntfy.sh'),
  NTFY_ACCESS_TOKEN: process.env.NTFY_ACCESS_TOKEN,
  POLL_INTERVAL_MS: parseInt(getEnv('POLL_INTERVAL_MS', '60000')),
  OZBARGAIN_API_URL: getEnv('OZBARGAIN_API_URL', 'https://www.ozbargain.com.au/api/live?disable=comments%2Cvotes%2Cwiki&types=Forum%2CComp%2CAd&update=1'),
  USER_AGENT: getEnv('USER_AGENT', 'curl/8.5.0'),
  DEBUG: process.env.DEBUG === 'true',
  // Allow passing the full cookie string from SPEC.md or a fresh one
  OZBARGAIN_COOKIES: process.env.OZBARGAIN_COOKIES,
  DATA_DIR: getEnv('DATA_DIR', 'data'),
  NTFY_DELAY_MS: parseInt(getEnv('NTFY_DELAY_MS', '1000')),
};
