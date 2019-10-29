module.exports = {
  MongoClient: {
    connect: jest.fn(() => ({
      on: jest.fn(),
      db: jest.fn(() => ({
        collection: jest.fn(),
        dropCollection: jest.fn(),
        listCollections: jest.fn(),
        stats: jest.fn(),
        createCollection: jest.fn(),
      })),
    })),
  },
};
