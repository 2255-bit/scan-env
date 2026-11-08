// Sample TypeScript file with Vite & modern destructuring
interface AppConfig {
  viteApi: string;
  analyticsKey?: string;
}

export function initConfig(): AppConfig {
  const { VITE_API_URL, VITE_ANALYTICS_KEY = 'none' } = import.meta.env;

  const appMode = import.meta.env.MODE;

  return {
    viteApi: VITE_API_URL,
    analyticsKey: VITE_ANALYTICS_KEY,
  };
}
