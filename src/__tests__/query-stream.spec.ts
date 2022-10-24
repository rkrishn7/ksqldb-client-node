import * as http2 from 'http2';
import { Duplex } from 'stream';

import { QueryStream } from '../query-stream';
import {
  KSQL_API_QUERY_STREAM_ENDPOINT,
  KSQL_API_DELIMITED_CONTENT_TYPE,
} from '../constants';
import {
  QueryStreamErrorMetadata,
  QueryStreamRequest,
  QueryStreamSuccessMetadata,
} from '../types';
import { KsqlDbQueryStreamError } from '../errors';

describe('#QueryStream', () => {
  test.each<QueryStreamRequest>([
    {
      sql: 'SELECT * FROM FAKE_TABLE',
    },
    {
      sql: 'SELECT * FROM ${name}',
      sessionVariables: {
        name: 'FAKE_TABLE',
      },
    },
    {
      sql: 'SELECT * FROM ${name}',
      properties: {
        ['auto.offset.reset']: 'earliest',
      },
      sessionVariables: {
        name: 'FAKE_TABLE',
      },
    },
  ])(
    'sends a request to the server and closes the writable end of the stream upon instantiation',
    (request) => {
      const testStream = new Duplex({
        read() {
          return;
        },
        write() {
          return;
        },
      });

      const mockConnect = jest.fn().mockReturnValueOnce({
        request() {
          return testStream as unknown as http2.ClientHttp2Stream;
        },
      });

      const mockSession = mockConnect();
      const requestSpy = jest.spyOn(mockSession, 'request');
      const testEndWritableSpy = jest.spyOn(testStream, 'end');

      const queryStream = new QueryStream(
        request.sql,
        request.sessionVariables,
        request.properties,
        mockSession,
      );

      const expectedHeaders = {
        [http2.constants.HTTP2_HEADER_PATH]: KSQL_API_QUERY_STREAM_ENDPOINT,
        [http2.constants.HTTP2_HEADER_METHOD]: 'POST',
        [http2.constants.HTTP2_HEADER_CONTENT_TYPE]:
          KSQL_API_DELIMITED_CONTENT_TYPE,
      };

      expect(requestSpy).toHaveBeenCalledTimes(1);
      expect(requestSpy).toHaveBeenNthCalledWith(1, expectedHeaders);
      expect(testEndWritableSpy).toHaveBeenCalledTimes(1);
      expect(testEndWritableSpy).toHaveBeenNthCalledWith(
        1,
        JSON.stringify({ ...request }),
      );
      expect(queryStream.stream).toBeDefined();
    },
  );

  test('parses metadata upon successful response and sets metadata properties on the query stream', async () => {
    const mockMetadata: QueryStreamSuccessMetadata = {
      queryId: 'test-123',
      columnNames: ['a', 'b', 'c'],
      columnTypes: ['STRING', 'BIGINT', 'STRING'],
    };

    const testStream = new Duplex({
      read() {
        return;
      },
      write() {
        return;
      },
    });

    testStream.push(Buffer.from(JSON.stringify(mockMetadata)));
    testStream.push(null);

    const mockConnect = jest.fn().mockReturnValueOnce({
      request() {
        return testStream as unknown as http2.ClientHttp2Stream;
      },
    });

    const mockSession = mockConnect();

    const queryStream = new QueryStream(
      'SELECT * FROM FAKE_TABLE',
      undefined,
      undefined,
      mockSession,
    );

    expect(queryStream.columnNames).toBeUndefined();
    expect(queryStream.columnTypes).toBeUndefined();
    expect(queryStream.queryId).toBeUndefined();

    for await (const _ of queryStream) {
    }

    expect(queryStream.columnNames).toEqual(mockMetadata.columnNames);
    expect(queryStream.columnTypes).toEqual(mockMetadata.columnTypes);
    expect(queryStream.queryId).toEqual(mockMetadata.queryId);
  });

  test('deserializes query result based on metadata', async () => {
    const mockMetadata: QueryStreamSuccessMetadata = {
      queryId: 'test-123',
      columnNames: ['a', 'b', 'c'],
      columnTypes: ['STRING', 'BIGINT', 'STRING'],
    };

    const mockRowResult = ['hi', 1, 'there'];

    const testStream = new Duplex({
      read() {
        return;
      },
      write() {
        return;
      },
    });

    testStream.push(Buffer.from(JSON.stringify(mockMetadata)));
    testStream.push(Buffer.from(JSON.stringify(mockRowResult)));
    testStream.push(null);

    const mockConnect = jest.fn().mockReturnValueOnce({
      request() {
        return testStream as unknown as http2.ClientHttp2Stream;
      },
    });

    const mockSession = mockConnect();

    const queryStream = new QueryStream(
      'SELECT * FROM FAKE_TABLE',
      undefined,
      undefined,
      mockSession,
    );

    expect(queryStream.columnNames).toBeUndefined();
    expect(queryStream.columnTypes).toBeUndefined();
    expect(queryStream.queryId).toBeUndefined();

    let rowsProcessed = 0;

    for await (const resultArr of queryStream) {
      expect(resultArr).toHaveLength(1);
      expect(resultArr[0]).toEqual({
        a: 'hi',
        b: 1,
        c: 'there',
      });
      rowsProcessed++;
    }

    expect(rowsProcessed).toEqual(1);
    expect(queryStream.columnNames).toEqual(mockMetadata.columnNames);
    expect(queryStream.columnTypes).toEqual(mockMetadata.columnTypes);
    expect(queryStream.queryId).toEqual(mockMetadata.queryId);
  });

  test('throws error upon receiving error code and sets error properties on the query stream', async () => {
    const mockMetadata: QueryStreamErrorMetadata = {
      ['@type']: 'test',
      ['error_code']: 4000,
      message: 'Test Error',
    };

    const testStream = new Duplex({
      read() {
        return;
      },
      write() {
        return;
      },
    });

    testStream.push(Buffer.from(JSON.stringify(mockMetadata)));
    testStream.push(null);

    const mockConnect = jest.fn().mockReturnValueOnce({
      request() {
        return testStream as unknown as http2.ClientHttp2Stream;
      },
    });

    const mockSession = mockConnect();

    const queryStream = new QueryStream(
      'SELECT * FROM FAKE_TABLE',
      undefined,
      undefined,
      mockSession,
    );

    expect(queryStream.columnNames).toBeUndefined();
    expect(queryStream.columnTypes).toBeUndefined();
    expect(queryStream.queryId).toBeUndefined();

    await expect(async () => {
      for await (const _ of queryStream) {
      }
    }).rejects.toThrowError(KsqlDbQueryStreamError);

    expect(queryStream.errorCode).toEqual(mockMetadata['error_code']);
    expect(queryStream.errorType).toEqual(mockMetadata['@type']);
    expect(queryStream.errorMessage).toEqual(mockMetadata.message);
  });
});
