import { assert, test } from 'vitest'
import { randomUUID } from 'node:crypto'

import { Volume, Sandbox, validateMountPath } from '../../src'
import { isDebug, template } from '../setup.js'

function uniqueVolumeName(): string {
  return `test-attach-${randomUUID().slice(0, 8)}`
}

// Skip: JuiceFS binary not yet in guest template - mount not working
test.skip('sandbox with volume', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })

  try {
    const sbx = await Sandbox.create(template, {
      volumeId: vol.volumeId,
      volumeMountPath: '/workspace/data',
      timeoutMs: 60_000,
    })

    try {
      assert.isTrue(await sbx.isRunning())

      // Verify the mount path exists
      const result = await sbx.commands.run('ls -la /workspace/data')
      assert.equal(result.exitCode, 0)
    } finally {
      await sbx.kill()
    }
  } finally {
    await vol.delete()
  }
})

// Skip: JuiceFS binary not yet in guest template - mount not working
test.skip('sandbox volume file persistence', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })
  const testContent = `test-content-${randomUUID().slice(0, 8)}`

  try {
    // Create first sandbox and write a file
    const sbx1 = await Sandbox.create(template, {
      volumeId: vol.volumeId,
      volumeMountPath: '/workspace/data',
      timeoutMs: 60_000,
    })

    try {
      await sbx1.commands.run(`echo '${testContent}' > /workspace/data/test.txt`)
    } finally {
      await sbx1.kill()
    }

    // Create second sandbox and read the file
    const sbx2 = await Sandbox.create(template, {
      volumeId: vol.volumeId,
      volumeMountPath: '/workspace/data',
      timeoutMs: 60_000,
    })

    try {
      const result = await sbx2.commands.run('cat /workspace/data/test.txt')
      assert.equal(result.exitCode, 0)
      assert.include(result.stdout, testContent)
    } finally {
      await sbx2.kill()
    }
  } finally {
    await vol.delete()
  }
})

test('validateMountPath allows valid paths', () => {
  // Should not throw for valid paths
  validateMountPath('/workspace/data')
  validateMountPath('/data/input')
  validateMountPath('/mnt/storage')
  validateMountPath('/volumes/my-vol')
})

test('validateMountPath rejects invalid paths', () => {
  // Empty path
  assert.throws(() => validateMountPath(''), /cannot be empty/)

  // Not absolute
  assert.throws(() => validateMountPath('relative/path'), /must be absolute/)

  // Invalid prefix
  assert.throws(() => validateMountPath('/etc/passwd'), /must start with one of/)
  assert.throws(() => validateMountPath('/home/user'), /must start with one of/)

  // Directory traversal
  assert.throws(() => validateMountPath('/workspace/../etc'), /cannot contain/)
})

test('sandbox volume missing mount path throws', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })

  try {
    let error: Error | undefined
    try {
      await Sandbox.create(template, {
        volumeId: vol.volumeId,
        // Missing volumeMountPath
        timeoutMs: 60_000,
      })
    } catch (e) {
      error = e as Error
    }
    assert.isDefined(error)
    assert.include(error!.message, 'volumeMountPath is required')
  } finally {
    await vol.delete()
  }
})

test('sandbox volume invalid mount path throws', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })

  try {
    let error: Error | undefined
    try {
      await Sandbox.create(template, {
        volumeId: vol.volumeId,
        volumeMountPath: '/etc/passwd', // Invalid prefix
        timeoutMs: 60_000,
      })
    } catch (e) {
      error = e as Error
    }
    assert.isDefined(error)
    assert.include(error!.message, 'must start with one of')
  } finally {
    await vol.delete()
  }
})
