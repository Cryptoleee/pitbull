const env = import.meta.env;

export const SITE_URL = (env.VITE_SITE_URL as string | undefined) || 'https://thepitbull.fun';
export const X_URL = (env.VITE_X_URL as string | undefined) || 'https://x.com/thepitbullfun';
export const PONS_URL = 'https://www.ponsfamily.com';
/** Where "Get $PITBULL" goes: the Pons token page once known, the launchpad before that. */
export const BUY_URL = (env.VITE_BUY_URL as string | undefined) || PONS_URL;
export const FORCE_PRELAUNCH = env.VITE_PRELAUNCH === '1';

export const dexscreenerUrl = (chain: string, address: string) => `https://dexscreener.com/${chain}/${address}`;
export const explorerTokenUrl = (explorer: string, address: string) => `${explorer.replace(/\/$/, '')}/token/${address}`;
