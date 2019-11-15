/* eslint-disable @typescript-eslint/no-empty-interface */
import { Db } from 'mongodb';
import MongoCollectionWrapper from './src/mongoCollectionWrapper';

export default class MongoWrapper extends Db {
  constructor();

  connect(mongoDbUrl: string, db: string): Promise<this>;

  disconnect(): Promise<this>;

  collection(name: string): Promise<MongoCollectionWrapper>;
}

/* Errors */
export class MongoError extends Error {}
export class MongoDuplicateEntryError extends MongoError {}
export class MongoNonExistentEntryError extends MongoError {}
