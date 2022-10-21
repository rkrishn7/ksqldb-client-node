import { KsqlDbSession } from './ksqldb-session';

import { KsqlDbServerConfig } from './types';

export class KsqlDbClient {
  constructor(private config: KsqlDbServerConfig) {}

  /**
   * Returns a ksqlDB session that enables communication
   * with the server's HTTP/2 endpoints
   */
  session() {
    return new KsqlDbSession(this.config);
  }
}
