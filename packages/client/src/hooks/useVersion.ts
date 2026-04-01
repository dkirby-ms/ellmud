export function useVersion() {
  return {
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0',
    buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev',
  };
}
