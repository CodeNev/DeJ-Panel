export type Bindings = {
  DB: D1Database;
  APP_ENV: string;
  APP_VERSION: string;
  DEPLOYMENT_PLATFORM: string;
};

export type AppVariables = {
  requestId: string;
  userId?: string;
  sessionId?: string;
};
