import { assert, test } from 'vitest'
import { randomUUID } from 'node:crypto'

import { Volume, Sandbox, validateMountPath } from '../../src'
import { isDebug, template } from '../setup.js'

function uniqueVolumeName(): string {
  return `test-attach-${randomUUID().slice(0, 8)}`
}

/**
 * Wait for volume mount to be ready.
 *
 * Volume mounts asynchronously after Sandbox.create() returns.
 * There's typically a 2-3 second gap. See limitations.md.
 */
async function waitForMount(
  sbx: Sandbox,
  path: string,
  timeoutMs: number = 30_000
): Promise<boolean> {
  const interval = 500
  let elapsed = 0
  while (elapsed < timeoutMs) {
    const result = await sbx.commands.run(
      `mountpoint -q ${path} && echo M || echo N`
    )
    if (result.stdout.includes('M')) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
    elapsed += interval
  }
  return false
}

test.skipIf(isDebug)('sandbox with volume', async () => {
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

      // Wait for volume mount (async mount has ~2-3s delay)
      const mountReady = await waitForMount(sbx, '/workspace/data')
      assert.isTrue(mountReady, 'Volume mount did not become ready in time')

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

test.skipIf(isDebug)('sandbox volume file persistence', async () => {
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
      // Wait for volume mount (async mount has ~2-3s delay)
      const mountReady1 = await waitForMount(sbx1, '/workspace/data')
      assert.isTrue(mountReady1, 'Volume mount did not become ready in time')

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
      // Wait for volume mount (async mount has ~2-3s delay)
      const mountReady2 = await waitForMount(sbx2, '/workspace/data')
      assert.isTrue(mountReady2, 'Volume mount did not become ready in time')

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

test.skipIf(isDebug)('sandbox volume python file persistence', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })
  const testContent = `python-content-${randomUUID().slice(0, 8)}`

  try {
    // Create first sandbox and write with Python
    const sbx1 = await Sandbox.create(template, {
      volumeId: vol.volumeId,
      volumeMountPath: '/workspace/data',
      timeoutMs: 60_000,
    })

    try {
      const mountReady1 = await waitForMount(sbx1, '/workspace/data')
      assert.isTrue(mountReady1, 'Volume mount did not become ready in time')

      // Fix permissions and write with Python
      await sbx1.commands.run('sudo chown -R user:user /workspace/data/')
      await sbx1.commands.run(
        `python3 -c "open('/workspace/data/pyfile.txt', 'w').write('${testContent}')"`
      )
    } finally {
      await sbx1.kill()
    }

    // Create second sandbox and verify
    const sbx2 = await Sandbox.create(template, {
      volumeId: vol.volumeId,
      volumeMountPath: '/workspace/data',
      timeoutMs: 60_000,
    })

    try {
      const mountReady2 = await waitForMount(sbx2, '/workspace/data')
      assert.isTrue(mountReady2, 'Volume mount did not become ready in time')

      const result = await sbx2.commands.run('cat /workspace/data/pyfile.txt')
      assert.equal(result.exitCode, 0)
      assert.include(result.stdout, testContent)
    } finally {
      await sbx2.kill()
    }
  } finally {
    await vol.delete()
  }
})

test.skipIf(isDebug)('sandbox volume nested directory persistence', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })
  const testContent = `nested-${randomUUID().slice(0, 8)}`

  try {
    // Create first sandbox and write nested file
    const sbx1 = await Sandbox.create(template, {
      volumeId: vol.volumeId,
      volumeMountPath: '/workspace/data',
      timeoutMs: 60_000,
    })

    try {
      const mountReady1 = await waitForMount(sbx1, '/workspace/data')
      assert.isTrue(mountReady1, 'Volume mount did not become ready in time')

      await sbx1.commands.run('sudo chown -R user:user /workspace/data/')
      await sbx1.commands.run('mkdir -p /workspace/data/deep/nested/dir')
      await sbx1.commands.run(
        `echo '${testContent}' > /workspace/data/deep/nested/dir/file.txt`
      )
    } finally {
      await sbx1.kill()
    }

    // Create second sandbox and verify
    const sbx2 = await Sandbox.create(template, {
      volumeId: vol.volumeId,
      volumeMountPath: '/workspace/data',
      timeoutMs: 60_000,
    })

    try {
      const mountReady2 = await waitForMount(sbx2, '/workspace/data')
      assert.isTrue(mountReady2, 'Volume mount did not become ready in time')

      const result = await sbx2.commands.run(
        'cat /workspace/data/deep/nested/dir/file.txt'
      )
      assert.equal(result.exitCode, 0)
      assert.include(result.stdout, testContent)
    } finally {
      await sbx2.kill()
    }
  } finally {
    await vol.delete()
  }
})

test.skipIf(isDebug)('sandbox volume binary file persistence', async () => {
  const name = uniqueVolumeName()
  const vol = await Volume.create({ name })

  try {
    // Create first sandbox and write binary file
    const sbx1 = await Sandbox.create(template, {
      volumeId: vol.volumeId,
      volumeMountPath: '/workspace/data',
      timeoutMs: 60_000,
    })

    let originalMd5 = ''
    try {
      const mountReady1 = await waitForMount(sbx1, '/workspace/data')
      assert.isTrue(mountReady1, 'Volume mount did not become ready in time')

      await sbx1.commands.run('sudo chown -R user:user /workspace/data/')
      // Write 512KB random binary file
      await sbx1.commands.run(
        'dd if=/dev/urandom of=/workspace/data/random.bin bs=1024 count=512 2>/dev/null'
      )
      const md5Result = await sbx1.commands.run('md5sum /workspace/data/random.bin')
      originalMd5 = md5Result.stdout.split(' ')[0]
    } finally {
      await sbx1.kill()
    }

    // Create second sandbox and verify integrity
    const sbx2 = await Sandbox.create(template, {
      volumeId: vol.volumeId,
      volumeMountPath: '/workspace/data',
      timeoutMs: 60_000,
    })

    try {
      const mountReady2 = await waitForMount(sbx2, '/workspace/data')
      assert.isTrue(mountReady2, 'Volume mount did not become ready in time')

      const md5Result = await sbx2.commands.run('md5sum /workspace/data/random.bin')
      const restoredMd5 = md5Result.stdout.split(' ')[0]
      assert.equal(restoredMd5, originalMd5, 'Binary file MD5 mismatch after restore')
    } finally {
      await sbx2.kill()
    }
  } finally {
    await vol.delete()
  }
})
