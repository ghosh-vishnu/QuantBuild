const env = import.meta.env;
const required = (key: string): string => {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing ${key}. Configure it in .env and restart Vite.`);
  return value;
};
function origin(key: string, protocols: string[]) {
  const value = env[key]?.trim();
  if (!value) return '';
  const url = new URL(value);
  if (!protocols.includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash)
    throw new Error(`${key} must be an origin without credentials, paths, or query parameters.`);
  return url.origin;
}
export const config = {
  apiOrigin: origin('VITE_API_ORIGIN', ['http:', 'https:']),
  wsOrigin: origin('VITE_WS_ORIGIN', ['ws:', 'wss:']),
  locale: required('VITE_LOCALE'),
  mapTileUrl: required('VITE_MAP_TILE_URL'),
  mapAttribution: required('VITE_MAP_ATTRIBUTION'),
  mapLinkUrl: required('VITE_MAP_LINK_URL'),
};
export const apiUrl = (path: string) => `${config.apiOrigin}${path}`;
export function socketUrl(path: string) {
  const base = new URL(config.wsOrigin || config.apiOrigin || window.location.origin);
  base.protocol = base.protocol === 'https:' || base.protocol === 'wss:' ? 'wss:' : 'ws:';
  return new URL(path, base).href;
}
