/* eslint-disable @typescript-eslint/no-empty-interface */
import { Db } from 'mongodb';

export default class MongoWrapper extends Db {
  constructor();

  connect(mongoDbUrl: string, db: string): Promise<this>;

  disconnect(): Promise<this>;
}

/* Errors */
export class MongoError extends Error {}
export class MongoDuplicateEntryError extends MongoError {}
export class MongoNonExistentEntryError extends MongoError {}
