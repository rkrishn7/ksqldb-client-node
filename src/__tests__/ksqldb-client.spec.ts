import { KsqlDbClient } from '..';
import { KsqlDbSession } from '../ksqldb-session';

jest.mock('../ksqldb-session', () => ({
  KsqlDbSession: jest.fn(),
}));

describe('#KsqlDbClient', () => {
  it('creates a new session', () => {
    (KsqlDbSession as unknown as jest.Mock).mockImplementation(() => undefined);

    const client = new KsqlDbClient({
      url: 'http://fakehost:1234',
    });

    client.session();

    expect(KsqlDbSession).toHaveBeenCalledTimes(1);
  });
});
