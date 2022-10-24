export interface KsqlDbBasicAuth {
  username: string;
  password: string;
}

export interface KsqlDbAuthTypes {
  basic: KsqlDbBasicAuth;
}

export interface KsqlDbServerConfig {
  auth?: Partial<KsqlDbAuthTypes>;
  url: string;
}

export interface QueryStreamRequest {
  sql: string;
  sessionVariables?: Record<string, any>;
  properties?: Record<string, any>;
}

export interface QueryStreamSuccessMetadata {
  queryId?: string;
  columnNames: string[];
  columnTypes: string[];
}

export interface QueryStreamErrorMetadata {
  ['@type']: string;
  ['error_code']: number;
  message: string;
}

export type QueryStreamMetadata =
  | QueryStreamErrorMetadata
  | QueryStreamSuccessMetadata;

export type SessionVariables = Record<string, any>;
export type QueryProperties = Record<string, any>;
