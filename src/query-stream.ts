import * as http2 from 'http2';
import internal, { Transform } from 'stream';
import {
  KSQL_API_DELIMITED_CONTENT_TYPE,
  KSQL_API_QUERY_STREAM_ENDPOINT,
} from './constants';
import { KsqlDbQueryStreamError } from './errors';
import {
  KsqlDbAuthTypes,
  QueryStreamSuccessMetadata,
  QueryStreamErrorMetadata,
  QueryStreamMetadata,
  QueryProperties,
  SessionVariables,
} from './types';

export class QueryStream<T = any> implements AsyncIterable<T[]> {
  private _success_metadata: QueryStreamSuccessMetadata | undefined;
  private _error_metadata: QueryStreamErrorMetadata | undefined;
  private _query_results_stream: NodeJS.ReadableStream;

  constructor(
    private _sql: string,
    private _sessionVariables: SessionVariables,
    private _queryProperties: QueryProperties,
    private _clientSession: http2.ClientHttp2Session,
    private _authConfig?: Partial<KsqlDbAuthTypes>,
  ) {
    this._query_results_stream = this.init();
  }

  /**
   * Returns the column names of the query. Only defined after the query's header
   * metadata has been parsed without error.
   */
  get columnNames(): string[] {
    return this._success_metadata?.columnNames;
  }

  /**
   * Returns the column types of the query. Only defined after the query's header
   * metadata has been parsed without error.
   */
  get columnTypes(): string[] {
    return this._success_metadata?.columnTypes;
  }

  /**
   * Returns the unique query ID for the query. Only defined for push queries.
   */
  get queryId(): string {
    return this._success_metadata?.queryId;
  }

  /**
   * Returns the error message the server returned, if any
   */
  get errorMessage(): string {
    return this._error_metadata?.message;
  }

  /**
   * Returns the error code the server returned, if any
   */
  get errorCode(): number {
    return this._error_metadata?.['error_code'];
  }

  /**
   * Returns the error type the server returned, if any
   */
  get errorType(): string {
    return this._error_metadata?.['@type'];
  }

  /**
   * Returns a reference to the underlying readable stream. Note that when reading data
   * via this stream, the typings do not accurately reflect the data coming in.
   */
  get stream(): NodeJS.ReadableStream {
    return this._query_results_stream;
  }

  private buildHeaders(path: string, method: string): Record<string, any> {
    const headers: Record<string, any> = {
      [http2.constants.HTTP2_HEADER_PATH]: path,
      [http2.constants.HTTP2_HEADER_METHOD]: method,
      [http2.constants.HTTP2_HEADER_CONTENT_TYPE]:
        KSQL_API_DELIMITED_CONTENT_TYPE,
    };

    if (this._authConfig?.basic) {
      headers[http2.constants.HTTP2_HEADER_AUTHORIZATION] = {
        username: this._authConfig.basic.username,
        password: this._authConfig.basic.password,
      };
    }

    return headers;
  }

  private parseChunk(buff: Buffer): string[] {
    return buff.toString().split('\n').filter(Boolean);
  }

  private parseRawHeaderMetadata(buf: Buffer): QueryStreamMetadata {
    return JSON.parse(buf.toString());
  }

  private transformChunk(
    chunk: any,
    encoding: BufferEncoding,
    callback: internal.TransformCallback,
  ) {
    if (!this._success_metadata) {
      const rawMeta = this.parseRawHeaderMetadata(chunk);

      if (rawMeta['error_code']) {
        this._error_metadata = rawMeta as QueryStreamErrorMetadata;
        return callback(
          new KsqlDbQueryStreamError(
            this._error_metadata['@type'],
            this._error_metadata['error_code'],
            this._error_metadata.message,
          ),
        );
      }

      this._success_metadata = rawMeta as QueryStreamSuccessMetadata;
      return callback(null);
    }

    const parsed: string[] = this.parseChunk(chunk);

    const results = parsed
      .map((raw) => JSON.parse(raw) as string[])
      .map((values) => {
        return this._success_metadata.columnNames.reduce((acc, key, i) => {
          acc[key] = values[i];
          return acc;
        }, {} as T);
      });

    return callback(null, results);
  }

  /**
   * Creates a HTTP/2 stream and closes the writable portion to signal
   * to the ksqlDB server that the client is ready to start receiving query
   * results.
   *
   * NOTE: This is not safe to be called directly
   */
  private init(): NodeJS.ReadableStream {
    const self = this;

    const transform = new Transform({
      readableObjectMode: true,
      transform: self.transformChunk.bind(self),
    });

    const stream = this._clientSession
      .request(this.buildHeaders(KSQL_API_QUERY_STREAM_ENDPOINT, 'POST'))
      .end(
        JSON.stringify({
          sql: this._sql,
          properties: this._queryProperties,
          sessionVariables: this._sessionVariables,
        }),
      );

    return stream.pipe(transform);
  }

  [Symbol.asyncIterator]() {
    return this._query_results_stream[Symbol.asyncIterator]() as AsyncIterator<
      T[]
    >;
  }
}
