declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: string;
    MONGO_URI: string;
    PORT: string;
  }
}
