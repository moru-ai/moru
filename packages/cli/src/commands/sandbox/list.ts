import * as tablePrinter from 'console-table-printer'
import * as commander from 'commander'

import { client, ensureAPIKey, connectionConfig } from 'src/api'

type SandboxRunStatus = 'running' | 'paused' | 'stopped'
type SandboxRunEndReason = 'killed' | 'timeout' | 'error' | 'shutdown'

interface SandboxRun {
  sandboxID: string
  templateID: string
  alias?: string
  status: SandboxRunStatus
  endReason?: SandboxRunEndReason
  createdAt: string
  endedAt?: string
}

function getStatusTitle(status?: SandboxRunStatus[]) {
  if (status?.length === 1) {
    if (status?.includes('running')) return 'Running sandboxes'
    if (status?.includes('paused')) return 'Paused sandboxes'
    if (status?.includes('stopped')) return 'Stopped sandboxes'
  }
  return 'Sandbox Runs'
}

export const listCommand = new commander.Command('list')
  .description('list sandbox runs (including stopped)')
  .alias('ls')
  .option(
    '-s, --status <status>',
    'filter by status: running, paused, stopped',
    (value) => value.split(',') as SandboxRunStatus[]
  )
  .option(
    '-L, --limit <limit>',
    'max runs to return (default 30)',
    (value) => parseInt(value)
  )
  .option('-f, --format <format>', 'output format: pretty, json')
  .action(async (options) => {
    try {
      const format = options.format || 'pretty'
      const runs = await listSandboxRuns({
        limit: options.limit || 30,
        status: options.status,
      })

      if (format === 'pretty') {
        renderTable(runs, options.status)
      } else if (format === 'json') {
        console.log(JSON.stringify(runs, null, 2))
      } else {
        console.error(`Unsupported output format: ${format}`)
        process.exit(1)
      }
    } catch (err: any) {
      console.error(err)
      process.exit(1)
    }
  })

function renderTable(runs: SandboxRun[], status?: SandboxRunStatus[]) {
  if (!runs?.length) {
    console.log('No sandbox runs found')
    return
  }

  const table = new tablePrinter.Table({
    title: getStatusTitle(status),
    columns: [
      { name: 'sandboxID', alignment: 'left', title: 'Sandbox ID' },
      {
        name: 'templateID',
        alignment: 'left',
        title: 'Template ID',
        maxLen: 20,
      },
      { name: 'alias', alignment: 'left', title: 'Alias' },
      { name: 'status', alignment: 'left', title: 'Status' },
      { name: 'endReason', alignment: 'left', title: 'End Reason' },
      { name: 'createdAt', alignment: 'left', title: 'Started' },
      { name: 'endedAt', alignment: 'left', title: 'Ended' },
    ],
    rows: runs
      .map((run) => ({
        ...run,
        alias: run.alias || '-',
        status: run.status.charAt(0).toUpperCase() + run.status.slice(1),
        endReason: run.endReason || '-',
        createdAt: new Date(run.createdAt).toLocaleString(),
        endedAt: run.endedAt ? new Date(run.endedAt).toLocaleString() : '-',
      }))
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) ||
          a.sandboxID.localeCompare(b.sandboxID)
      ),
    style: {
      headerTop: {
        left: '',
        right: '',
        mid: '',
        other: '',
      },
      headerBottom: {
        left: '',
        right: '',
        mid: '',
        other: '',
      },
      tableBottom: {
        left: '',
        right: '',
        mid: '',
        other: '',
      },
      vertical: '',
    },
    colorMap: {
      orange: '\x1b[38;5;216m',
    },
  })
  table.printTable()

  process.stdout.write('\n')
}

type ListSandboxRunsOptions = {
  limit?: number
  status?: SandboxRunStatus[]
}

export async function listSandboxRuns({
  limit = 30,
  status,
}: ListSandboxRunsOptions = {}): Promise<SandboxRun[]> {
  ensureAPIKey()

  const res = await client.api.GET('/v2/sandbox-runs', {
    params: {
      query: {
        status,
        limit,
      },
    },
    signal: connectionConfig.getSignal(),
  })

  if (res.error) {
    throw new Error(res.error.message || 'Failed to list sandbox runs')
  }

  return (res.data as SandboxRun[]) || []
}
