import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
let postA: string
let postAWithoutSubtitle: string

describe('relationship where conditions with access control', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const categoryA = await payload.create({
      collection: 'categories',
      data: { slug: 'a', state: 'active' },
    })
    const categoryB = await payload.create({
      collection: 'categories',
      data: { slug: 'b', state: 'active' },
    })

    postA = (
      await payload.create({
        collection: 'posts',
        data: { category: categoryA.id, subtitle: 'Subtitle', title: 'Post A' },
      })
    ).id
    postAWithoutSubtitle = (
      await payload.create({
        collection: 'posts',
        data: { category: categoryA.id, title: 'Post A without subtitle' },
      })
    ).id
    await payload.create({
      collection: 'posts',
      data: { category: categoryB.id, title: 'Post B' },
    })
  })

  const findPostIDs = async (
    where: Parameters<Payload['find']>[0]['where'],
    overrideAccess = false,
  ) =>
    (await payload.find({ collection: 'posts', overrideAccess, where })).docs
      .map((post) => post.id)
      .sort()

  // FAILS: returns all three posts, including Post B from category "b"
  it('two conditions on the same relationship', async () => {
    expect(
      await findPostIDs({
        'category.slug': { equals: 'a' },
        'category.state': { equals: 'active' },
      }),
    ).toEqual([postA, postAWithoutSubtitle].sort())
  })

  // FAILS: the `exists` condition is dropped, so Post A without subtitle is returned too
  it('relationship condition next to an exists condition', async () => {
    expect(
      await findPostIDs({
        'category.slug': { equals: 'a' },
        subtitle: { exists: true },
      }),
    ).toEqual([postA])
  })

  // PASSES: the same conditions as separate `and` entries
  it('same conditions wrapped in `and`', async () => {
    expect(
      await findPostIDs({
        and: [
          { 'category.slug': { equals: 'a' } },
          { 'category.state': { equals: 'active' } },
        ],
      }),
    ).toEqual([postA, postAWithoutSubtitle].sort())
  })

  // FAILS even without access control: an explicit sibling `and` overwrites the
  // `$and` the Mongo adapter builds for the two `category.*` conditions
  it('two conditions on the same relationship next to an explicit `and`', async () => {
    expect(
      await findPostIDs(
        {
          'category.slug': { equals: 'a' },
          'category.state': { equals: 'active' },
          and: [{ title: { exists: true } }],
        },
        true,
      ),
    ).toEqual([postA, postAWithoutSubtitle].sort())
  })
})
