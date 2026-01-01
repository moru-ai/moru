import { assert, test } from 'vitest'

import { CommandExitError, Sandbox } from '../../src'
import { template, isDebug } from '../setup.js'

test.skipIf(isDebug)('internet access enabled', async () => {
  const sbx = await Sandbox.create(template, {
    allowInternetAccess: true,
  })
  try {
    // Test internet connectivity by making a curl request to a reliable external site
    // Note: moru.io has no DNS A record (only wildcard *.moru.io), so we use google.com
    const result = await sbx.commands.run(
      "curl -s -o /dev/null -w '%{http_code}' https://google.com"
    )
    assert.equal(result.exitCode, 0)
    // google.com may return 200 or 301 redirect
    assert.isTrue(['200', '301'].includes(result.stdout.trim()))
  } finally {
    await sbx.kill()
  }
})

test.skipIf(isDebug)('internet access disabled', async () => {
  const sbx = await Sandbox.create(template, {
    allowInternetAccess: false,
  })
  try {
    // Test that internet connectivity is blocked by making a curl request
    try {
      await sbx.commands.run(
        'curl --connect-timeout 3 --max-time 5 -Is https://google.com'
      )
      // If we reach here, the command succeeded, which means internet access is not properly disabled
      assert.fail('Expected command to fail when internet access is disabled')
    } catch (error) {
      // The command should fail or timeout when internet access is disabled
      assert.isTrue(error instanceof CommandExitError)
      assert.notEqual(error.exitCode, 0)
    }
  } finally {
    await sbx.kill()
  }
})

test.skipIf(isDebug)('internet access default', async () => {
  const sbx = await Sandbox.create(template)
  try {
    // Test internet connectivity by making a curl request to a reliable external site
    // Note: moru.io has no DNS A record (only wildcard *.moru.io), so we use google.com
    const result = await sbx.commands.run(
      "curl -s -o /dev/null -w '%{http_code}' https://google.com"
    )
    assert.equal(result.exitCode, 0)
    // google.com may return 200 or 301 redirect
    assert.isTrue(['200', '301'].includes(result.stdout.trim()))
  } finally {
    await sbx.kill()
  }
})
