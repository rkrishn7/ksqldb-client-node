export class KsqlDbError extends Error {}

export class KsqlDbQueryStreamError extends KsqlDbError {
  constructor(
    public type: string,
    public errorCode: number,
    public message: string,
  ) {
    super(message);
  }
}
