import { MongoClient } from 'mongodb';

import MongoWrapper from '../mongoWrapper';

describe('mongoWrapper', () => {
  beforeEach(() => {
    MongoClient.connect.mockClear();
  });

  describe('constructor', () => {
    it('should initalize connected = false', () => {
      const mongoInstance = new MongoWrapper();
      expect(mongoInstance.connected).toBe(false);
    });

    it('should initalize connection = null', () => {
      const mongoInstance = new MongoWrapper();
      expect(mongoInstance.connection).toBe(null);
    });

    it('should initalize db = null', () => {
      const mongoInstance = new MongoWrapper();
      expect(mongoInstance.db).toBe(null);
    });
  });

  describe('connect', () => {
    it('should throw if allready connected', async () => {
      const mongoInstance = new MongoWrapper();
      await mongoInstance.connect('a', 'b');
      expect(mongoInstance.connect('a', 'b')).rejects.toThrow(/Already connected/);
    });

    it('should call MongoClient.connect with good params', async () => {
      const mongoInstance = new MongoWrapper();
      await mongoInstance.connect('aaa', 'bb');
      expect(MongoClient.connect).toHaveBeenCalledTimes(1);
      expect(MongoClient.connect).toHaveBeenCalledWith('aaa', expect.any(Object));
    });

    it('should user go good db', async () => {
      const dbMock = jest.fn();
      MongoClient.connect.mockImplementation(
        jest.fn(() => ({
          db: dbMock,
        })),
      );
      const mongoInstance = new MongoWrapper();
      await mongoInstance.connect('aaa', 'bb');
      expect(dbMock).toHaveBeenCalledTimes(1);
      expect(dbMock).toHaveBeenCalledWith('bb');
    });
  });

  describe('disconnect', () => {
    it('should throw if not connection', async () => {
      const mongoInstance = new MongoWrapper();
      expect(mongoInstance.disconnect()).rejects.toThrow(/Not connected/);
    });

    it('should throw if not connection', async () => {
      const mongoInstance = new MongoWrapper();
      expect(mongoInstance.disconnect()).rejects.toThrow();
    });

    it('should call connection.close', async () => {
      const mongoInstance = new MongoWrapper();
      const closeMock = jest.fn();
      mongoInstance.connected = true;
      mongoInstance.connection = { close: closeMock };
      await mongoInstance.disconnect();
      expect(closeMock).toHaveBeenCalledTimes(1);
    });
    it('should reset connected, connection and db', async () => {
      const mongoInstance = new MongoWrapper();
      mongoInstance.connected = true;
      mongoInstance.connection = { close: jest.fn() };
      mongoInstance.db = jest.fn();

      await mongoInstance.disconnect();
      expect(mongoInstance.connected).toBe(false);
      expect(mongoInstance.connection).toBe(null);
      expect(mongoInstance.db).toBe(null);
    });
  });

  ['collection', 'dropCollection', 'listCollections', 'stats', 'createCollection'].forEach(fn =>
    describe(fn, () => {
      it(`should call ${fn} with same arguments`, async () => {
        const mock = jest.fn();
        MongoClient.connect.mockImplementation(
          jest.fn(() => ({
            db: jest.fn(() => ({
              [fn]: mock,
            })),
          })),
        );

        const mongoInstance = new MongoWrapper();
        await mongoInstance.connect();
        expect(mock).toHaveBeenCalledTimes(0);
        mongoInstance[fn]('aplfa', 'beta', 'charly');
        expect(mock).toHaveBeenCalledTimes(1);
      });
    }),
  );
});
