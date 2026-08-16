export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV: string;
  APP_VERSION: string;
  DEPLOYMENT_PLATFORM: string;
};

export type AppVariables = {
  requestId: string;
  userId?: string;
  sessionId?: string;
};
