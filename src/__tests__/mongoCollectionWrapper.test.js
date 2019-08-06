import MongoCollectionWrapper from '../mongoCollectionWrapper';
import { MongoDuplicateEntryError, MongoError, MongoNonExistentEntryError } from '../mongoError';

describe('mongoCollectionWrapper', () => {
  describe('constructor', () => {
    it('should have the right collection name', async () => {
      const clientMock = {
        collection: jest.fn(),
      };

      const collection = await new MongoCollectionWrapper(clientMock, 'test');

      expect(collection.collectionName).toBe('test');
    });

    it('should throw error when not providing a client', async () => {
      const construct = async () => {
        await new MongoCollectionWrapper(null, 'test');
      };

      expect(construct()).rejects.toThrow(MongoError);
    });

    it('should throw error when not providing a dysfunctional client', async () => {
      const clientMock = {
        collection: jest.fn(() => {
          throw new MongoError();
        }),
      };
      const construct = async () => {
        await new MongoCollectionWrapper(clientMock, 'test');
      };

      expect(construct()).rejects.toThrow(MongoError);
    });

    it('should throw error when not providing a collection name', async () => {
      const clientMock = {
        collection: jest.fn(),
      };
      const construct = async () => {
        await new MongoCollectionWrapper(clientMock, null);
      };

      expect(construct()).rejects.toThrow(MongoError);
    });
  });

  describe('insertOne', () => {
    it('should retrieve an existing document', async () => {
      const document = { uuid: 'aaa', foo: 'bar' };
      const toArrayMock = jest.fn(() => []);
      const clientMock = {
        collection: jest.fn(() => ({
          find: jest.fn(() => ({
            toArray: toArrayMock,
          })),
          insertOne: jest.fn(insertedDocument => [insertedDocument]),
        })),
      };

      const collection = await new MongoCollectionWrapper(clientMock, 'test');
      await collection.insertOne(document);

      expect(toArrayMock).toHaveBeenCalledTimes(1);
    });

    it('should throw an error upon inserting existing UUID', async () => {
      const document = { uuid: 'aaa', foo: 'bar' };
      const clientMock = {
        collection: jest.fn(() => ({
          find: jest.fn(() => ({
            toArray: jest.fn(() => [document]),
          })),
          insertOne: jest.fn(insertedDocument => [insertedDocument]),
        })),
      };
      const insert = async () => {
        const collection = await new MongoCollectionWrapper(clientMock, 'test');
        await collection.insertOne(document);
      };
      expect(insert()).rejects.toThrow(MongoDuplicateEntryError);
    });
  });

  describe('updateOne', () => {
    it('should update a document', async () => {
      const document = { uuid: 'aaa', foo: 'bar' };
      const findOneAndUpdateMock = jest.fn(() => ({
        value: document,
      }));
      const clientMock = {
        collection: jest.fn(() => ({
          findOneAndUpdate: findOneAndUpdateMock,
        })),
      };

      const collection = await new MongoCollectionWrapper(clientMock, 'test');
      await collection.updateOne(document.uuid, { foo: document.foo });

      expect(findOneAndUpdateMock).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when updating a dysfunctional UUID', async () => {
      const clientMock = {
        collection: jest.fn(() => ({
          findOneAndUpdate: jest.fn(() => ({
            value: null,
          })),
        })),
      };
      const update = async () => {
        const collection = await new MongoCollectionWrapper(clientMock, 'test');
        await collection.updateOne();
      };

      expect(update()).rejects.toThrow(MongoNonExistentEntryError);
    });
  });

  describe('deleteOne', () => {
    it('should delete a document', async () => {
      const document = { uuid: 'aaa', foo: 'bar' };
      const findOneAndDeleteMock = jest.fn(() => ({
        value: document,
      }));
      const clientMock = {
        collection: jest.fn(() => ({
          findOneAndDelete: findOneAndDeleteMock,
        })),
      };

      const collection = await new MongoCollectionWrapper(clientMock, 'test');
      await collection.deleteOne({ uuid: document.uuid }, { foo: document.foo });

      expect(findOneAndDeleteMock).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when deleting a dysfunctional UUID', async () => {
      const clientMock = {
        collection: jest.fn(() => ({
          findOneAndDelete: jest.fn(() => ({
            value: null,
          })),
        })),
      };
      const deleteAction = async () => {
        const collection = await new MongoCollectionWrapper(clientMock, 'test');
        await collection.deleteOne({ uuid: '1232412412' });
      };

      expect(deleteAction()).rejects.toThrow(MongoNonExistentEntryError);
    });
  });

  describe('deleteMany', () => {
    it('should delete a document', async () => {
      const document = { uuid: 'aaa', foo: 'bar' };
      const findAndRemoveMock = jest.fn(() => ({
        value: document,
      }));
      const clientMock = {
        collection: jest.fn(() => ({
          findAndRemove: findAndRemoveMock,
        })),
      };

      const collection = await new MongoCollectionWrapper(clientMock, 'test');
      await collection.deleteMany({ uuid: document.uuid }, { foo: document.foo });

      expect(findAndRemoveMock).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when deleting a dysfunctional UUID', async () => {
      const clientMock = {
        collection: jest.fn(() => ({
          findAndRemove: jest.fn(() => ({
            value: null,
          })),
        })),
      };
      const deleteAction = async () => {
        const collection = await new MongoCollectionWrapper(clientMock, 'test');
        await collection.deleteMany({ uuid: '1232412412' });
      };

      expect(deleteAction()).rejects.toThrow(MongoNonExistentEntryError);
    });
  });

  describe('find', () => {
    it('should find a mocked value', async () => {
      const data = [{ uuid: 'aaa', name: 'foo' }, { uuid: 'bbb', name: 'bar' }];
      const clientMock = {
        collection: jest.fn(() => ({
          find: jest.fn(() => data),
        })),
      };

      const collection = await new MongoCollectionWrapper(clientMock, 'test');
      const result = await collection.find();

      expect(result).toEqual(data);
    });
  });

  describe('findOne', () => {
    it('should findOne a mocked value', async () => {
      const data = [{ uuid: 'aaa', name: 'foo' }, { uuid: 'bbb', name: 'bar' }];
      const clientMock = {
        collection: jest.fn(() => ({
          findOne: jest.fn(() => data[0]),
        })),
      };

      const collection = await new MongoCollectionWrapper(clientMock, 'test');
      const result = await collection.findOne({ uuid: 'aaa' });

      expect(result).toEqual(data[0]);
    });
  });

  describe('insertMany', () => {
    it('should insert a many mocked values', async () => {
      const data = [{ uuid: 'aaa', name: 'foo' }, { uuid: 'bbb', name: 'bar' }];
      const clientMock = {
        collection: jest.fn(() => ({
          insertMany: jest.fn(insertedData => insertedData),
        })),
      };

      const collection = await new MongoCollectionWrapper(clientMock, 'test');
      const result = await collection.insertMany(data);

      expect(result).toEqual(data);
    });
  });
});
