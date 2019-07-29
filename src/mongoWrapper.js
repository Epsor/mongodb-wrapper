// eslint-disable-next-line no-unused-vars
import { MongoClient, Db, Collection, ClientSession, CommandCursor } from 'mongodb';

import MongoCollectionWrapper from './mongoCollectionWrapper';
import MongoError from './mongoError';

/**
 * Mongo DB wrapper. Easier mock and tests (test with `@shelf/jest-mongodb`)
 *
 * @property {Boolean} connected - The connected state
 * @property {MongoClient} connection - The mongodb connection
 * @property {Db} db - The selected database
 */
export default class MongoWrapper {
  constructor() {
    this.connected = false;
    this.connection = null;
    this.db = null;
  }

  async connect(mongoDbUrl, db) {
    if (this.connected) {
      throw new MongoError('Already connected.');
    }

    this.connection = await MongoClient.connect(mongoDbUrl, { useNewUrlParser: true });
    this.db = this.connection.db(db);
    this.connected = true;

    return this;
  }

  async disconnect() {
    if (!this.connected) {
      throw new MongoError('Not connected.');
    }

    await this.connection.close();
    this.connected = false;
    this.connection = null;
    this.db = null;

    return this;
  }

  /**
   * Get access to a specific Mongo collection
   *
   * @method
   * @param {String} collectionName the collection name we wish to access.
   * @return {MongoCollectionWrapper} return the new Collection instance
   */
  collection(collectionName) {
    return new MongoCollectionWrapper(this.db, collectionName);
  }

  /**
   * Drop a collection from the database, removing it permanently. New accesses will create a new collection.
   *
   * @method
   * @param {String} name Name of collection to drop
   * @param {Object} [options] Optional settings
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Db~resultCallback} [callback] The results callback
   * @return {Promise} returns Promise if no callback passed
   */
  dropCollection(...args) {
    return this.db.dropCollection(...args);
  }

  /**
   * Get the list of all collection information for the specified db.
   *
   * @method
   * @param {Object} [filter={}] Query to filter collections by
   * @param {Object} [options] Optional settings.
   * @param {Boolean} [options.nameOnly=false] Since 4.0: If true, will only return the collection name in the response, and will omit additional info
   * @param {Number} [options.batchSize] The batchSize for the returned command cursor or if pre 2.8 the systems batch collection
   * @param {(ReadPreference|string)} [options.readPreference] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @return {CommandCursor}
   */
  listCollections(...args) {
    return this.db.listCollections(...args);
  }

  /**
   * Get all the db statistics.
   *
   * @method
   * @param {Object} [options] Optional settings.
   * @param {Number} [options.scale] Divide the returned sizes by scale value.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Db~resultCallback} [callback] The collection result callback
   * @return {Promise} returns Promise if no callback passed
   */
  stats(...args) {
    return this.db.stats(...args);
  }

  /**
   * Create a new collection on a server with the specified options. Use this to create capped collections.
   * More information about command options available at https://docs.mongodb.com/manual/reference/command/create/
   *
   * @method
   * @param {String} name the collection name we wish to access.
   * @param {Object} [options] Optional settings.
   * @param {(number|string)} [options.w] The write concern.
   * @param {Number} [options.wtimeout] The write concern timeout.
   * @param {Boolean} [options.j=false] Specify a journal write concern.
   * @param {Boolean} [options.raw=false] Return document results as raw BSON buffers.
   * @param {Object} [options.pkFactory] A primary key factory object for generation of custom _id keys.
   * @param {(ReadPreference|string)} [options.readPreference] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
   * @param {Boolean} [options.serializeFunctions=false] Serialize functions on any object.
   * @param {Boolean} [options.strict=false] Returns an error if the collection does not exist
   * @param {Boolean} [options.capped=false] Create a capped collection.
   * @param {Boolean} [options.autoIndexId=true] DEPRECATED: Create an index on the _id field of the document, True by default on MongoDB 2.6 - 3.0
   * @param {Number} [options.size] The size of the capped collection in bytes.
   * @param {Number} [options.max] The maximum number of documents in the capped collection.
   * @param {Number} [options.flags] Optional. Available for the MMAPv1 storage engine only to set the usePowerOf2Sizes and the noPadding flag.
   * @param {Object} [options.storageEngine] Allows users to specify configuration to the storage engine on a per-collection basis when creating a collection on MongoDB 3.0 or higher.
   * @param {Object} [options.validator] Allows users to specify validation rules or expressions for the collection. For more information, see Document Validation on MongoDB 3.2 or higher.
   * @param {String} [options.validationLevel] Determines how strictly MongoDB applies the validation rules to existing documents during an update on MongoDB 3.2 or higher.
   * @param {String} [options.validationAction] Determines whether to error on invalid documents or just warn about the violations but allow invalid documents to be inserted on MongoDB 3.2 or higher.
   * @param {Object} [options.indexOptionDefaults] Allows users to specify a default configuration for indexes when creating a collection on MongoDB 3.2 or higher.
   * @param {String} [options.viewOn] The name of the source collection or view from which to create the view. The name is not the full namespace of the collection or view; i.e. does not include the database name and implies the same database as the view to create on MongoDB 3.4 or higher.
   * @param {Array} [options.pipeline] An array that consists of the aggregation pipeline stage. create creates the view by applying the specified pipeline to the viewOn collection or view on MongoDB 3.4 or higher.
   * @param {Object} [options.collation] Specify collation (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Db~collectionResultCallback} [callback] The results callback
   * @return {Promise} returns Promise if no callback passed
   */
  createCollection(...args) {
    return this.db.createCollection(...args);
  }

  /**
   * Fetch all collections for the current db.
   *
   * @method
   * @param {Object} [options] Optional settings
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Db~collectionsResultCallback} [callback] The results callback
   * @return {Promise} returns Promise if no callback passed
   */
  collections(...args) {
    return this.db.collections(...args);
  }
}
