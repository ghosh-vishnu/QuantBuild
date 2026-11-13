import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value) throw new Error(`Missing ${key}. Copy .env.example to .env and configure it.`);
    return value;
  };
  const port = (key: string) => {
    const value = Number(required(key));
    if (!Number.isInteger(value) || value < 1 || value > 65535)
      throw new Error(`${key} must be a port between 1 and 65535.`);
    return value;
  };
  const target = required('API_TARGET');
  if (!['http:', 'https:'].includes(new URL(target).protocol))
    throw new Error('API_TARGET must use HTTP or HTTPS.');
  const proxy = {
    '/api': { target, changeOrigin: true },
    '/ws': { target: target.replace(/^http/, 'ws'), ws: true, changeOrigin: true },
  };
  return {
    plugins: [react()],
    server: { host: required('DEV_HOST'), port: port('DEV_PORT'), strictPort: true, proxy },
    preview: { host: required('PREVIEW_HOST'), port: port('PREVIEW_PORT'), strictPort: true, proxy },
  };
});
