import { assert, test, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'

import { Volume } from '../../src'
import { isDebug } from '../setup.js'

function uniqueVolumeName(): string {
  return `test-vol-${randomUUID().slice(0, 8)}`
}

test.skipIf(isDebug)('create volume', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })

  try {
    assert.isTrue(vol.volumeId.startsWith('vol_'))
    assert.equal(vol.name, name)
    assert.isAtLeast(vol.totalSizeBytes, 0)
    assert.isAtLeast(vol.totalFileCount, 0)
  } finally {
    await vol.delete()
  }
})

test.skipIf(isDebug)('create volume idempotent', async () => {
  const name = uniqueVolumeName()
  const vol1 = await Volume.create({ name })

  try {
    // Second create should return the same volume
    const vol2 = await Volume.create({ name })

    assert.equal(vol1.volumeId, vol2.volumeId)
    assert.equal(vol1.name, vol2.name)
  } finally {
    await vol1.delete()
  }
})

test.skipIf(isDebug)('get volume by ID', async () => {
  const name = uniqueVolumeName()
  const created = await Volume.create({ name })

  try {
    const fetched = await Volume.get(created.volumeId)

    assert.equal(fetched.volumeId, created.volumeId)
    assert.equal(fetched.name, name)
  } finally {
    await created.delete()
  }
})

test.skipIf(isDebug)('get volume by name', async () => {
  const name = uniqueVolumeName()
  const created = await Volume.create({ name })

  try {
    const fetched = await Volume.get(name)

    assert.equal(fetched.volumeId, created.volumeId)
    assert.equal(fetched.name, name)
  } finally {
    await created.delete()
  }
})

test.skipIf(isDebug)('list volumes', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })

  try {
    const volumes = await Volume.list()

    // Find our created volume in the list
    const found = volumes.find((v) => v.volumeId === vol.volumeId)
    assert.isDefined(found)
    assert.equal(found?.name, name)
  } finally {
    await vol.delete()
  }
})

test.skipIf(isDebug)('delete volume', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })

  // Delete should succeed
  const result = await vol.delete()
  assert.isTrue(result)

  // Get should throw NotFoundError
  try {
    await Volume.get(vol.volumeId)
    assert.fail('Expected NotFoundError')
  } catch (err) {
    assert.include((err as Error).message, 'not found')
  }
})

test.skipIf(isDebug)('get volume info', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })

  try {
    const info = await vol.getInfo()

    assert.equal(info.volumeId, vol.volumeId)
    assert.equal(info.name, name)
    assert.isAtLeast(info.totalSizeBytes, 0)
    assert.isAtLeast(info.totalFileCount, 0)
    assert.isDefined(info.createdAt)
    assert.isDefined(info.updatedAt)
  } finally {
    await vol.delete()
  }
})
