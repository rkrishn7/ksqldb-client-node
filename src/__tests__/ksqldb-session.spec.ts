import * as http2 from 'http2';
import { QueryStream } from '../query-stream';
import { KsqlDbSession } from '../ksqldb-session';

jest.mock('http2');
jest.mock('../query-stream', () => ({
  QueryStream: jest.fn(),
}));

describe('#KsqlDbSession', () => {
  test('initializes HTTP/2 session upon construction', () => {
    const http2ConnectSpy = jest
      .spyOn(http2, 'connect')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .mockImplementation(() => undefined);

    new KsqlDbSession({
      url: 'http://fakehost:1234',
    });

    expect(http2ConnectSpy).toHaveBeenCalledTimes(1);
  });

  test('creates a new query stream', () => {
    (QueryStream as unknown as jest.Mock).mockImplementation(() => undefined);

    const session = new KsqlDbSession({
      url: 'http://fakehost:1234',
    });

    session.queryStream({
      sql: 'SELECT * FROM FAKE_STREAM',
    });

    expect(QueryStream).toHaveBeenCalledTimes(1);
  });
});
