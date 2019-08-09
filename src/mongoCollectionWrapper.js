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
    return new Promise(async (resolve, reject) => {
      try {
        this.collection = await mongoClient.collection(collectionName, ...args);
        this.collectionName = collectionName;
      } catch (err) {
        return reject(err);
      }
      return resolve(this);
    });
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

  insertMany(...args) {
    return this.collection.insertMany(...args); // TODO: Implement this method to insert only field that have a non-existing UUID.
  }

  /**
   * Update a document into the Mongo collection
   *
   * @param {Object} filters - filters of the document that needs to be updated
   * @param {Object} fields - Document properties
   * @param {String} strategy - Update stategy. default = "$set"
   * @returns {Promise} - Promise of update
   */
  async updateOne(filters, fields, stategy = '$set') {
    const { value } = await this.collection.findOneAndUpdate(filters, { [stategy]: fields });
    if (!value) {
      throw new MongoNonExistentEntryError(
        `Cannot update ${this.collectionName}: UUID doesn't exists.`,
      );
    }
    return value;
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

  find(...args) {
    return this.collection.find(...args);
  }

  findOne(...args) {
    return this.collection.findOne(...args);
  }

  countDocuments(...args) {
    return this.collection.countDocuments(...args);
  }
}
