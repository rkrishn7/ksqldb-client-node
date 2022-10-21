import * as http2 from 'http2';

import { QueryStream } from './query-stream';
import { KsqlDbServerConfig, QueryStreamRequest } from './types';

export class KsqlDbSession {
  private _session: http2.ClientHttp2Session;

  constructor(private config: KsqlDbServerConfig) {
    this._session = http2.connect(config.url);
  }

  /**
   * Creates a new query stream
   */
  queryStream<T>({
    properties,
    sessionVariables,
    sql,
  }: QueryStreamRequest): QueryStream<T> {
    return new QueryStream<T>(
      sql,
      sessionVariables,
      properties,
      this._session,
      this.config.auth,
    );
  }

  /**
   * Returns a reference to the underlying HTTP/2 session
   */
  get session(): http2.ClientHttp2Session {
    return this._session;
  }

  /**
   * Destroys the underlying HTTP/2 session.
   */
  destroy() {
    this._session.destroy();
  }

  /**
   * Closes the underlying HTTP/2 session.
   */
  close() {
    this._session.close();
  }
}
