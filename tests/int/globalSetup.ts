import { MongoMemoryServer } from 'mongodb-memory-server'

let mongo: MongoMemoryServer

export async function setup() {
  mongo = await MongoMemoryServer.create()
  process.env.DATABASE_URL = mongo.getUri('payload-repro')
}

export async function teardown() {
  await mongo.stop()
}
