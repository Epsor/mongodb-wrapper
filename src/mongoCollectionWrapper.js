import { MongoDuplicateEntryError, MongoError, MongoNonExistentEntryError } from './mongoError';

/**
 * Mongo Collection Wrapper. Used to perform read/write operations on Mongo documents
 *
 * @class
 * @property {Collection} collection - The Collection instance from MongoDB driver
 * @property {String} collectionName - The collection name
 */
export default class MongoCollectionWrapper {
  constructor(mongoClient, collectionName, ...args) {
    if (!mongoClient) {
      throw new MongoError('Mongo client is not provided.');
    }
    if (!collectionName) {
      throw new MongoError('Collection name is not provided.');
    }
    const promise = async (resolve, reject) => {
      try {
        this.collection = await mongoClient.collection(collectionName, ...args);
        this.collectionName = collectionName;
      } catch (err) {
        return reject(err);
      }
      return resolve(this);
    };

    return new Promise(promise);
  }

  /**
   * Insert a document into the Mongo collection if the UUID doesn't exist already
   *
   * @param {Object} fields - The document properties
   * @param {String} fields.uuid - UUID of the document that will be inserted
   * @returns {Promise} - Promise of insertion
   */
  async insertOne({ uuid, ...fields }) {
    const existingDocument = await this.collection.find({ uuid }).toArray();

    if (existingDocument.length) {
      throw new MongoDuplicateEntryError(
        `Cannot insert into ${this.collectionName}: UUID already exists.`,
      );
    }

    return this.collection.insertOne({ uuid, ...fields });
  }

  /**
   * Update a document into the Mongo collection
   *
   * @param {Object} filters - filters of the document that needs to be updated
   * @param {Object} fields - Document properties
   * @param {String} strategy - Update stategy. default = "$set"
   * @returns {Promise} - Promise of update
   */
  async updateOne(filters, fields, strategy = '$set') {
    const { value } = await this.collection.findOneAndUpdate(filters, { [strategy]: fields });

    if (!value) {
      throw new MongoNonExistentEntryError(
        `Cannot update ${this.collectionName}: UUID doesn't exists.`,
      );
    }
    return value;
  }

  /**
   * Insert subfield in document and looking for duplicate Uuid
   *
   * @param {Object} filters - filters of the document that needs to be updated
   * @param {Object} fields - Document properties
   * @returns {Promise} - Promise of update
   */
  async safeInsertSubfields(filters, fields) {
    const subField = Object.keys(fields)[0];
    const filter = `${subField}.uuid`;
    const existingDocument = await this.collection
      .find({ [filter]: fields[subField].uuid })
      .limit(1)
      .size();

    if (existingDocument) {
      throw new MongoDuplicateEntryError(
        `Cannot insert into ${this.collectionName}: UUID already exists.`,
      );
    }
    await this.updateOne(filters, fields, '$push');
  }

  /**
   * Update documents into the Mongo collection
   *
   * @param {Object} filters - filters of the document that needs to be updated
   * @param {Object} fields - Document properties
   * @param {String} strategy - Update stategy. default = "$set"
   * @returns {Promise} - Promise of update
   */
  async updateMany(filters, fields, stategy = '$set') {
    const { value } = await this.collection.updateMany(filters, { [stategy]: fields });

    return value;
  }

  /**
   * Delete a document from the Mongo collection
   *
   * @param {Object} fields -The fields used for deletion
   * @param {String} fields.uuid - UUID of the document that needs to be deleted
   * @returns {Promise} - Promise of deletion
   */
  async deleteOne(fields) {
    const { value } = await this.collection.findOneAndDelete(fields);

    if (!value) {
      throw new MongoNonExistentEntryError(
        `Cannot delete ${this.collectionName}: UUID doesn't exists.`,
      );
    }

    return value;
  }

  /**
   * Delete documents from the Mongo collection
   *
   * @param {Object} fields -The fields used for deletion
   * @param {String} fields.uuid - UUID of the document that needs to be deleted
   * @returns {Promise} - Promise of deletion
   */
  async deleteMany(fields) {
    const { value } = await this.collection.findAndRemove(fields);

    return value;
  }

  /**
   * @deprecated
   */
  find(...args) {
    return this.collection.find(...args);
  }

  /**
   * Inserts an array of documents into MongoDB. If documents passed in do not contain the **_id** field,
   * one will be added to each of the documents missing it by the driver, mutating the document. This behavior
   * can be overridden by setting the **forceServerObjectId** flag.
   *
   * @method
   * @param {object[]} docs Documents to insert.
   * @param {object} [options] Optional settings.
   * @param {(number|string)} [options.w] The write concern.
   * @param {number} [options.wtimeout] The write concern timeout.
   * @param {boolean} [options.j=false] Specify a journal write concern.
   * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
   * @param {boolean} [options.forceServerObjectId=false] Force server to assign _id values instead of driver.
   * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
   * @param {boolean} [options.ordered=true] If true, when an insert fails, don't execute the remaining writes. If false, continue with remaining inserts when one fails.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~insertWriteOpCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  insertMany(...args) {
    return this.collection.insertMany(...args);
  }

  /**
   * @typedef {Object} Collection~BulkWriteOpResult
   * @property {number} insertedCount Number of documents inserted.
   * @property {number} matchedCount Number of documents matched for update.
   * @property {number} modifiedCount Number of documents modified.
   * @property {number} deletedCount Number of documents deleted.
   * @property {number} upsertedCount Number of documents upserted.
   * @property {object} insertedIds Inserted document generated Id's, hash key is the index of the originating operation
   * @property {object} upsertedIds Upserted document generated Id's, hash key is the index of the originating operation
   * @property {object} result The command result object.
   */
  /**
   * The callback format for inserts
   * @callback Collection~bulkWriteOpCallback
   * @param {BulkWriteError} error An error instance representing the error during the execution.
   * @param {Collection~BulkWriteOpResult} result The result object if the command was executed successfully.
   */
  /**
   * Perform a bulkWrite operation without a fluent API
   *
   * Legal operation types are
   *
   *  { insertOne: { document: { a: 1 } } }
   *
   *  { updateOne: { filter: {a:2}, update: {$set: {a:2}}, upsert:true } }
   *
   *  { updateMany: { filter: {a:2}, update: {$set: {a:2}}, upsert:true } }
   *
   *  { deleteOne: { filter: {c:1} } }
   *
   *  { deleteMany: { filter: {c:1} } }
   *
   *  { replaceOne: { filter: {c:3}, replacement: {c:4}, upsert:true}}
   *
   * If documents passed in do not contain the **_id** field,
   * one will be added to each of the documents missing it by the driver, mutating the document. This behavior
   * can be overridden by setting the **forceServerObjectId** flag.
   *
   * @method
   * @param {object[]} operations Bulk operations to perform.
   * @param {object} [options] Optional settings.
   * @param {(number|string)} [options.w] The write concern.
   * @param {number} [options.wtimeout] The write concern timeout.
   * @param {boolean} [options.j=false] Specify a journal write concern.
   * @param {boolean} [options.serializeFunctions=false] Serialize functions on any object.
   * @param {boolean} [options.ordered=true] Execute write operation in ordered or unordered fashion.
   * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~bulkWriteOpCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  bulkWrite(...args) {
    return this.collection.bulkWrite(...args);
  }

  /**
   * @typedef {Object} Collection~WriteOpResult
   * @property {object[]} ops All the documents inserted using insertOne/insertMany/replaceOne. Documents contain the _id field if forceServerObjectId == false for insertOne/insertMany
   * @property {object} connection The connection object used for the operation.
   * @property {object} result The command result object.
   */
  /**
   * The callback format for inserts
   * @callback Collection~writeOpCallback
   * @param {MongoError} error An error instance representing the error during the execution.
   * @param {Collection~WriteOpResult} result The result object if the command was executed successfully.
   */
  /**
   * @typedef {Object} Collection~insertWriteOpResult
   * @property {Number} insertedCount The total amount of documents inserted.
   * @property {object[]} ops All the documents inserted using insertOne/insertMany/replaceOne. Documents contain the _id field if forceServerObjectId == false for insertOne/insertMany
   * @property {Object.<Number, ObjectId>} insertedIds Map of the index of the inserted document to the id of the inserted document.
   * @property {object} connection The connection object used for the operation.
   * @property {object} result The raw command result object returned from MongoDB (content might vary by server version).
   * @property {Number} result.ok Is 1 if the command executed correctly.
   * @property {Number} result.n The total count of documents inserted.
   */
  /**
   * @typedef {Object} Collection~insertOneWriteOpResult
   * @property {Number} insertedCount The total amount of documents inserted.
   * @property {object[]} ops All the documents inserted using insertOne/insertMany/replaceOne. Documents contain the _id field if forceServerObjectId == false for insertOne/insertMany
   * @property {ObjectId} insertedId The driver generated ObjectId for the insert operation.
   * @property {object} connection The connection object used for the operation.
   * @property {object} result The raw command result object returned from MongoDB (content might vary by server version).
   * @property {Number} result.ok Is 1 if the command executed correctly.
   * @property {Number} result.n The total count of documents inserted.
   */
  /**
   * The callback format for inserts
   * @callback Collection~insertWriteOpCallback
   * @param {MongoError} error An error instance representing the error during the execution.
   * @param {Collection~insertWriteOpResult} result The result object if the command was executed successfully.
   */
  /**
   * The callback format for inserts
   * @callback Collection~insertOneWriteOpCallback
   * @param {MongoError} error An error instance representing the error during the execution.
   * @param {Collection~insertOneWriteOpResult} result The result object if the command was executed successfully.
   */
  /**
   * Replace a document in a collection with another document
   * @method
   * @param {object} filter The Filter used to select the document to replace
   * @param {object} doc The Document that replaces the matching document
   * @param {object} [options] Optional settings.
   * @param {boolean} [options.upsert=false] Update operation is an upsert.
   * @param {(number|string)} [options.w] The write concern.
   * @param {number} [options.wtimeout] The write concern timeout.
   * @param {boolean} [options.j=false] Specify a journal write concern.
   * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~updateWriteOpCallback} [callback] The command result callback
   * @return {Promise<Collection~updatewriteOpResultObject>} returns Promise if no callback passed
   */
  replaceOne(...args) {
    return this.collection.replaceOne(...args);
  }

  /**
   * The callback format for results
   * @callback Collection~resultCallback
   * @param {MongoError} error An error instance representing the error during the execution.
   * @param {object} result The result object if the command was executed successfully.
   */
  /**
   * The callback format for an aggregation call
   * @callback Collection~aggregationCallback
   * @param {MongoError} error An error instance representing the error during the execution.
   * @param {AggregationCursor} cursor The cursor if the aggregation command was executed successfully.
   */
  /**
   * Fetches the first document that matches the query
   * @method
   * @param {object} query Query for find Operation
   * @param {object} [options] Optional settings.
   * @param {number} [options.limit=0] Sets the limit of documents returned in the query.
   * @param {(array|object)} [options.sort] Set to sort the documents coming back from the query. Array of indexes, [['a', 1]] etc.
   * @param {object} [options.projection] The fields to return in the query. Object of fields to include or exclude (not both), {'a':1}
   * @param {object} [options.fields] **Deprecated** Use `options.projection` instead
   * @param {number} [options.skip=0] Set to skip N documents ahead in your query (useful for pagination).
   * @param {Object} [options.hint] Tell the query to use specific indexes in the query. Object of indexes to use, {'_id':1}
   * @param {boolean} [options.explain=false] Explain the query instead of returning the data.
   * @param {boolean} [options.snapshot=false] DEPRECATED: Snapshot query.
   * @param {boolean} [options.timeout=false] Specify if the cursor can timeout.
   * @param {boolean} [options.tailable=false] Specify if the cursor is tailable.
   * @param {number} [options.batchSize=0] Set the batchSize for the getMoreCommand when iterating over the query results.
   * @param {boolean} [options.returnKey=false] Only return the index key.
   * @param {number} [options.maxScan] DEPRECATED: Limit the number of items to scan.
   * @param {number} [options.min] Set index bounds.
   * @param {number} [options.max] Set index bounds.
   * @param {boolean} [options.showDiskLoc=false] Show disk location of results.
   * @param {string} [options.comment] You can put a $comment field on a query to make looking in the profiler logs simpler.
   * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
   * @param {boolean} [options.promoteLongs=true] Promotes Long values to number if they fit inside the 53 bits resolution.
   * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
   * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
   * @param {(ReadPreference|string)} [options.readPreference] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
   * @param {boolean} [options.partial=false] Specify if the cursor should return partial results when querying against a sharded system
   * @param {number} [options.maxTimeMS] Number of miliseconds to wait before aborting the query.
   * @param {object} [options.collation] Specify collation (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  findOne(...args) {
    return this.collection.findOne(...args);
  }

  /**
   * The callback format for the collection method, must be used if strict is specified
   * @callback Collection~collectionResultCallback
   * @param {MongoError} error An error instance representing the error during the execution.
   * @param {Collection} collection The collection instance.
   */
  /**
   * Rename the collection.
   *
   * @method
   * @param {string} newName New name of of the collection.
   * @param {object} [options] Optional settings.
   * @param {boolean} [options.dropTarget=false] Drop the target name collection if it previously exists.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~collectionResultCallback} [callback] The results callback
   * @return {Promise} returns Promise if no callback passed
   */
  rename(...args) {
    return this.collection.rename(...args);
  }

  /**
   * Drop the collection from the database, removing it permanently. New accesses will create a new collection.
   *
   * @method
   * @param {object} [options] Optional settings.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The results callback
   * @return {Promise} returns Promise if no callback passed
   */
  drop(...args) {
    return this.collection.drop(...args);
  }

  /**
   * Returns the options of the collection.
   *
   * @method
   * @param {Object} [options] Optional settings
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The results callback
   * @return {Promise} returns Promise if no callback passed
   */
  options(...args) {
    return this.collection.options(...args);
  }

  /**
   * Returns if the collection is a capped collection
   *
   * @method
   * @param {Object} [options] Optional settings
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The results callback
   * @return {Promise} returns Promise if no callback passed
   */
  isCapped(...args) {
    return this.collection.isCapped(...args);
  }

  /**
   * Creates an index on the db and collection collection.
   * @method
   * @param {(string|object)} fieldOrSpec Defines the index.
   * @param {object} [options] Optional settings.
   * @param {(number|string)} [options.w] The write concern.
   * @param {number} [options.wtimeout] The write concern timeout.
   * @param {boolean} [options.j=false] Specify a journal write concern.
   * @param {boolean} [options.unique=false] Creates an unique index.
   * @param {boolean} [options.sparse=false] Creates a sparse index.
   * @param {boolean} [options.background=false] Creates the index in the background, yielding whenever possible.
   * @param {boolean} [options.dropDups=false] A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value
   * @param {number} [options.min] For geospatial indexes set the lower bound for the co-ordinates.
   * @param {number} [options.max] For geospatial indexes set the high bound for the co-ordinates.
   * @param {number} [options.v] Specify the format version of the indexes.
   * @param {number} [options.expireAfterSeconds] Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher)
   * @param {string} [options.name] Override the autogenerated index name (useful if the resulting name is larger than 128 bytes)
   * @param {object} [options.partialFilterExpression] Creates a partial index based on the given filter object (MongoDB 3.2 or higher)
   * @param {object} [options.collation] Specify collation (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */ createIndex(...args) {
    return this.collection.createIndex(...args);
  }

  /**
   * Creates multiple indexes in the collection, this method is only supported for
   * MongoDB 2.6 or higher. Earlier version of MongoDB will throw a command not supported
   * error. Index specifications are defined at http://docs.mongodb.org/manual/reference/command/createIndexes/.
   * @method
   * @param {array} indexSpecs An array of index specifications to be created
   * @param {Object} [options] Optional settings
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  createIndexes(...args) {
    return this.collection.createIndexes(...args);
  }

  /**
   * Drops an index from this collection.
   * @method
   * @param {string} indexName Name of the index to drop.
   * @param {object} [options] Optional settings.
   * @param {(number|string)} [options.w] The write concern.
   * @param {number} [options.wtimeout] The write concern timeout.
   * @param {boolean} [options.j=false] Specify a journal write concern.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {number} [options.maxTimeMS] Number of miliseconds to wait before aborting the query.
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */ dropIndex(...args) {
    return this.collection.dropIndex(...args);
  }

  /**
   * Drops all indexes from this collection.
   * @method
   * @param {Object} [options] Optional settings
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {number} [options.maxTimeMS] Number of miliseconds to wait before aborting the query.
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  dropIndexes(...args) {
    return this.collection.dropIndexes(...args);
  }

  /**
   * Reindex all indexes on the collection
   * Warning: reIndex is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
   * @method
   * @param {Object} [options] Optional settings
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  reIndex(...args) {
    return this.collection.reIndex(...args);
  }

  /**
   * Get the list of all indexes information for the collection.
   *
   * @method
   * @param {object} [options] Optional settings.
   * @param {number} [options.batchSize] The batchSize for the returned command cursor or if pre 2.8 the systems batch collection
   * @param {(ReadPreference|string)} [options.readPreference] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @return {CommandCursor}
   */ listIndexes(...args) {
    return this.collection.listIndexes(...args);
  }

  /**
   * Checks if one or more indexes exist on the collection, fails on first non-existing index
   * @method
   * @param {(string|array)} indexes One or more index names to check.
   * @param {Object} [options] Optional settings
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  indexExists(...args) {
    return this.collection.indexExists(...args);
  }

  /**
   * Retrieves this collections index info.
   * @method
   * @param {object} [options] Optional settings.
   * @param {boolean} [options.full=false] Returns the full raw index information.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */ indexInformation(...args) {
    return this.collection.indexInformation(...args);
  }

  /**
   * The callback format for results
   * @callback Collection~countCallback
   * @param {MongoError} error An error instance representing the error during the execution.
   * @param {number} result The count of documents that matched the query.
   */
  /**
   * Gets an estimate of the count of documents in a collection using collection metadata.
   *
   * @method
   * @param {object} [options] Optional settings.
   * @param {number} [options.maxTimeMS] The maximum amount of time to allow the operation to run.
   * @param {Collection~countCallback} [callback] The command result callback.
   * @return {Promise} returns Promise if no callback passed.
   */
  estimatedDocumentCount(...args) {
    return this.collection.estimatedDocumentCount(...args);
  }

  /**
   * Gets the number of documents matching the filter.
   *
   * **Note**: When migrating from {@link Collection#count count} to {@link Collection#countDocuments countDocuments}
   * the following query operators must be replaced:
   *
   * | Operator | Replacement |
   * | -------- | ----------- |
   * | `$where`   | [`$expr`][1] |
   * | `$near`    | [`$geoWithin`][2] with [`$center`][3] |
   * | `$nearSphere` | [`$geoWithin`][2] with [`$centerSphere`][4] |
   *
   * [1]: https://docs.mongodb.com/manual/reference/operator/query/expr/
   * [2]: https://docs.mongodb.com/manual/reference/operator/query/geoWithin/
   * [3]: https://docs.mongodb.com/manual/reference/operator/query/center/#op._S_center
   * [4]: https://docs.mongodb.com/manual/reference/operator/query/centerSphere/#op._S_centerSphere
   *
   * @param {object} [query] the query for the count
   * @param {object} [options] Optional settings.
   * @param {object} [options.collation] Specifies a collation.
   * @param {string|object} [options.hint] The index to use.
   * @param {number} [options.limit] The maximum number of document to count.
   * @param {number} [options.maxTimeMS] The maximum amount of time to allow the operation to run.
   * @param {number} [options.skip] The number of documents to skip before counting.
   * @param {Collection~countCallback} [callback] The command result callback.
   * @return {Promise} returns Promise if no callback passed.
   * @see https://docs.mongodb.com/manual/reference/operator/query/expr/
   * @see https://docs.mongodb.com/manual/reference/operator/query/geoWithin/
   * @see https://docs.mongodb.com/manual/reference/operator/query/center/#op._S_center
   * @see https://docs.mongodb.com/manual/reference/operator/query/centerSphere/#op._S_centerSphere
   */ countDocuments(...args) {
    return this.collection.countDocuments(...args);
  }

  /**
   * The distinct command returns returns a list of distinct values for the given key across a collection.
   * @method
   * @param {string} key Field of the document to find distinct values for.
   * @param {object} query The query for filtering the set of documents to which we apply the distinct filter.
   * @param {object} [options] Optional settings.
   * @param {(ReadPreference|string)} [options.readPreference] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
   * @param {number} [options.maxTimeMS] Number of miliseconds to wait before aborting the query.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  distinct(...args) {
    return this.collection.distinct(...args);
  }

  /**
   * Retrieve all the indexes on the collection.
   * @method
   * @param {Object} [options] Optional settings
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  indexes(...args) {
    return this.collection.indexes(...args);
  }

  /**
   * Get all the collection statistics.
   *
   * @method
   * @param {object} [options] Optional settings.
   * @param {number} [options.scale] Divide the returned sizes by scale value.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The collection result callback
   * @return {Promise} returns Promise if no callback passed
   */
  stats(...args) {
    return this.collection.stats(...args);
  }

  /**
   * @typedef {Object} Collection~findAndModifyWriteOpResult
   * @property {object} value Document returned from findAndModify command.
   * @property {object} lastErrorObject The raw lastErrorObject returned from the command.
   * @property {Number} ok Is 1 if the command executed correctly.
   */
  /**
   * The callback format for inserts
   * @callback Collection~findAndModifyCallback
   * @param {MongoError} error An error instance representing the error during the execution.
   * @param {Collection~findAndModifyWriteOpResult} result The result object if the command was executed successfully.
   */
  /**
   * Find a document and delete it in one atomic operation. Requires a write lock for the duration of the operation.
   *
   * @method
   * @param {object} filter The Filter used to select the document to remove
   * @param {object} [options] Optional settings.
   * @param {object} [options.projection] Limits the fields to return for all matching documents.
   * @param {object} [options.sort] Determines which document the operation modifies if the query selects multiple documents.
   * @param {number} [options.maxTimeMS] The maximum amount of time to allow the query to run.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~findAndModifyCallback} [callback] The collection result callback
   * @return {Promise<Collection~findAndModifyWriteOpResultObject>} returns Promise if no callback passed
   */
  findOneAndDelete(...args) {
    return this.collection.findOneAndDelete(...args);
  }

  /**
   * Find a document and replace it in one atomic operation. Requires a write lock for the duration of the operation.
   *
   * @method
   * @param {object} filter The Filter used to select the document to replace
   * @param {object} replacement The Document that replaces the matching document
   * @param {object} [options] Optional settings.
   * @param {object} [options.projection] Limits the fields to return for all matching documents.
   * @param {object} [options.sort] Determines which document the operation modifies if the query selects multiple documents.
   * @param {number} [options.maxTimeMS] The maximum amount of time to allow the query to run.
   * @param {boolean} [options.upsert=false] Upsert the document if it does not exist.
   * @param {boolean} [options.returnOriginal=true] When false, returns the updated document rather than the original. The default is true.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~findAndModifyCallback} [callback] The collection result callback
   * @return {Promise<Collection~findAndModifyWriteOpResultObject>} returns Promise if no callback passed
   */
  findOneAndReplace(...args) {
    return this.collection.findOneAndReplace(...args);
  }

  /**
   * Find a document and update it in one atomic operation. Requires a write lock for the duration of the operation.
   *
   * @method
   * @param {object} filter The Filter used to select the document to update
   * @param {object} update Update operations to be performed on the document
   * @param {object} [options] Optional settings.
   * @param {object} [options.projection] Limits the fields to return for all matching documents.
   * @param {object} [options.sort] Determines which document the operation modifies if the query selects multiple documents.
   * @param {number} [options.maxTimeMS] The maximum amount of time to allow the query to run.
   * @param {boolean} [options.upsert=false] Upsert the document if it does not exist.
   * @param {boolean} [options.returnOriginal=true] When false, returns the updated document rather than the original. The default is true.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Array} [options.arrayFilters] optional list of array filters referenced in filtered positional operators
   * @param {Collection~findAndModifyCallback} [callback] The collection result callback
   * @return {Promise<Collection~findAndModifyWriteOpResultObject>} returns Promise if no callback passed
   */
  findOneAndUpdate(...args) {
    return this.collection.findOneAndUpdate(...args);
  }

  /**
   * Execute an aggregation framework pipeline against the collection, needs MongoDB >= 2.2
   * @method
   * @param {object} [pipeline=[]] Array containing all the aggregation framework commands for the execution.
   * @param {object} [options] Optional settings.
   * @param {(ReadPreference|string)} [options.readPreference] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
   * @param {object} [options.cursor] Return the query as cursor, on 2.6 > it returns as a real cursor on pre 2.6 it returns as an emulated cursor.
   * @param {number} [options.cursor.batchSize] The batchSize for the cursor
   * @param {boolean} [options.explain=false] Explain returns the aggregation execution plan (requires mongodb 2.6 >).
   * @param {boolean} [options.allowDiskUse=false] allowDiskUse lets the server know if it can use disk to store temporary results for the aggregation (requires mongodb 2.6 >).
   * @param {number} [options.maxTimeMS] maxTimeMS specifies a cumulative time limit in milliseconds for processing operations on the cursor. MongoDB interrupts the operation at the earliest following interrupt point.
   * @param {boolean} [options.bypassDocumentValidation=false] Allow driver to bypass schema validation in MongoDB 3.2 or higher.
   * @param {boolean} [options.raw=false] Return document results as raw BSON buffers.
   * @param {boolean} [options.promoteLongs=true] Promotes Long values to number if they fit inside the 53 bits resolution.
   * @param {boolean} [options.promoteValues=true] Promotes BSON values to native types where possible, set to false to only receive wrapper types.
   * @param {boolean} [options.promoteBuffers=false] Promotes Binary BSON values to native Node Buffers.
   * @param {object} [options.collation] Specify collation (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
   * @param {string} [options.comment] Add a comment to an aggregation command
   * @param {string|object} [options.hint] Add an index selection hint to an aggregation command
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~aggregationCallback} callback The command result callback
   * @return {(null|AggregationCursor)}
   */
  aggregate(...args) {
    return this.collection.aggregate(...args);
  }

  /**
   * Create a new Change Stream, watching for new changes (insertions, updates, replacements, deletions, and invalidations) in this collection.
   * @method
   * @since 3.0.0
   * @param {Array} [pipeline] An array of {@link https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/|aggregation pipeline stages} through which to pass change stream documents. This allows for filtering (using $match) and manipulating the change stream documents.
   * @param {object} [options] Optional settings
   * @param {string} [options.fullDocument='default'] Allowed values: ‘default’, ‘updateLookup’. When set to ‘updateLookup’, the change stream will include both a delta describing the changes to the document, as well as a copy of the entire document that was changed from some time after the change occurred.
   * @param {object} [options.resumeAfter] Specifies the logical starting point for the new change stream. This should be the _id field from a previously returned change stream document.
   * @param {number} [options.maxAwaitTimeMS] The maximum amount of time for the server to wait on new documents to satisfy a change stream query
   * @param {number} [options.batchSize] The number of documents to return per batch. See {@link https://docs.mongodb.com/manual/reference/command/aggregate|aggregation documentation}.
   * @param {object} [options.collation] Specify collation settings for operation. See {@link https://docs.mongodb.com/manual/reference/command/aggregate|aggregation documentation}.
   * @param {ReadPreference} [options.readPreference] The read preference. Defaults to the read preference of the database or collection. See {@link https://docs.mongodb.com/manual/reference/read-preference|read preference documentation}.
   * @param {Timestamp} [options.startAtClusterTime] receive change events that occur after the specified timestamp
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @return {ChangeStream} a ChangeStream instance.
   */
  watch(...args) {
    return this.collection.watch(...args);
  }

  /**
   * The callback format for results
   * @callback Collection~parallelCollectionScanCallback
   * @param {MongoError} error An error instance representing the error during the execution.
   * @param {Cursor[]} cursors A list of cursors returned allowing for parallel reading of collection.
   */
  /**
   * Return N number of parallel cursors for a collection allowing parallel reading of entire collection. There are
   * no ordering guarantees for returned results.
   * @method
   * @param {object} [options] Optional settings.
   * @param {(ReadPreference|string)} [options.readPreference] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
   * @param {number} [options.batchSize] Set the batchSize for the getMoreCommand when iterating over the query results.
   * @param {number} [options.numCursors=1] The maximum number of parallel command cursors to return (the number of returned cursors will be in the range 1:numCursors)
   * @param {boolean} [options.raw=false] Return all BSON documents as Raw Buffer documents.
   * @param {Collection~parallelCollectionScanCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  parallelCollectionScan(...args) {
    return this.collection.parallelCollectionScan(...args);
  }

  /**
   * Execute a geo search using a geo haystack index on a collection.
   *
   * @method
   * @param {number} x Point to search on the x axis, ensure the indexes are ordered in the same order.
   * @param {number} y Point to search on the y axis, ensure the indexes are ordered in the same order.
   * @param {object} [options] Optional settings.
   * @param {(ReadPreference|string)} [options.readPreference] The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
   * @param {number} [options.maxDistance] Include results up to maxDistance from the point.
   * @param {object} [options.search] Filter the results by a query.
   * @param {number} [options.limit=false] Max number of results to return.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {Collection~resultCallback} [callback] The command result callback
   * @return {Promise} returns Promise if no callback passed
   */
  geoHaystackSearch(...args) {
    return this.collection.geoHaystackSearch(...args);
  }

  /**
   * Initiate an Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.
   *
   * @method
   * @param {object} [options] Optional settings.
   * @param {(number|string)} [options.w] The write concern.
   * @param {number} [options.wtimeout] The write concern timeout.
   * @param {boolean} [options.j=false] Specify a journal write concern.
   * @param {boolean} [options.ignoreUndefined=false] Specify if the BSON serializer should ignore undefined fields.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @return {UnorderedBulkOperation}
   */
  initializeUnorderedBulkOp(...args) {
    return this.collection.initializeUnorderedBulkOp(...args);
  }

  /**
   * Initiate an In order bulk write operation. Operations will be serially executed in the order they are added, creating a new operation for each switch in types.
   *
   * @method
   * @param {object} [options] Optional settings.
   * @param {(number|string)} [options.w] The write concern.
   * @param {number} [options.wtimeout] The write concern timeout.
   * @param {boolean} [options.j=false] Specify a journal write concern.
   * @param {ClientSession} [options.session] optional session to use for this operation
   * @param {boolean} [options.ignoreUndefined=false] Specify if the BSON serializer should ignore undefined fields.
   * @param {OrderedBulkOperation} callback The command result callback
   * @return {null}
   */

  initializeOrderedBulkOp(...args) {
    return this.collection.initializeOrderedBulkOp(...args);
  }
}
