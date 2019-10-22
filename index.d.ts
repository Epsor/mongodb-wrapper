/* eslint-disable @typescript-eslint/no-empty-interface */
import { Db } from 'mongodb';

export default interface MongoWrapper extends Db {
  connect(mongoDbUrl: string, db: string): Promise<this>;
  disconnect(): Promise<this>;
}

/* Errors */
export interface MongoError extends Error {}
export interface MongoDuplicateEntryError extends MongoError {}
export interface MongoNonExistentEntryError extends MongoError {}