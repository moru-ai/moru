import * as commander from 'commander'
import * as moru from '@moru-ai/core'
import * as chalk from 'chalk'

import { client, connectionConfig } from 'src/api'
import { asBold, withUnderline } from 'src/utils/format'
import { wait } from 'src/utils/wait'
import { handleMoruRequestError } from '../../utils/errors'
import { waitForSandboxEnd, formatEnum, Format, isRunning } from './utils'

type SandboxLogEntry = moru.components['schemas']['SandboxLogEntry']
type SandboxLogEventType = moru.components['schemas']['SandboxLogEventType']

enum EventTypeFilter {
  ALL = 'all',
  STDOUT = 'stdout',
  STDERR = 'stderr',
}

export const logsCommand = new commander.Command('logs')
  .description('show logs for sandbox')
  .argument(
    '<sandboxID>',
    `show logs for sandbox specified by ${asBold('<sandboxID>')}`
  )
  .alias('lg')
  .option('-f, --follow', 'keep streaming logs until the sandbox is closed')
  .option('-t, --timestamps', 'show timestamps for each log entry')
  .option(
    '--type <type>',
    `filter by event type (${formatEnum(EventTypeFilter)})`,
    EventTypeFilter.ALL
  )
  .option(
    '--format <format>',
    `specify format for printing logs (${formatEnum(Format)})`,
    Format.PRETTY
  )
  .action(
    async (
      sandboxID: string,
      opts?: {
        follow: boolean
        timestamps: boolean
        type: string
        format: Format
      }
    ) => {
      try {
        const typeFilter = opts?.type?.toLowerCase() as
          | EventTypeFilter
          | undefined
        if (typeFilter && !Object.values(EventTypeFilter).includes(typeFilter)) {
          throw new Error(`Invalid event type filter: ${typeFilter}`)
        }

        const format = opts?.format?.toLowerCase() as Format | undefined
        if (format && !Object.values(Format).includes(format)) {
          throw new Error(`Invalid log format: ${format}`)
        }

        const getIsRunning = opts?.follow
          ? waitForSandboxEnd(sandboxID)
          : () => false

        let cursor: number | undefined
        let isFirstRun = true
        let firstLogsPrinted = false

        if (format === Format.PRETTY) {
          console.log(`\nLogs for sandbox ${asBold(sandboxID)}:`)
        }

        // Convert type filter to API eventType parameter
        const eventType: SandboxLogEventType | undefined =
          typeFilter === EventTypeFilter.STDOUT
            ? 'stdout'
            : typeFilter === EventTypeFilter.STDERR
              ? 'stderr'
              : undefined

        do {
          const logs = await listSandboxLogs({ sandboxID, cursor, eventType })

          if (logs.length !== 0 && firstLogsPrinted === false) {
            firstLogsPrinted = true
            process.stdout.write('\n')
          }

          for (const log of logs) {
            printLog(log, opts?.timestamps ?? false, format)
          }

          const isSandboxRunning = await isRunning(sandboxID)

          if (!isSandboxRunning && logs.length === 0 && isFirstRun) {
            if (format === Format.PRETTY) {
              console.log(
                `\nStopped printing logs — sandbox ${withUnderline(
                  'not found'
                )}`
              )
            }
            break
          }

          if (!isSandboxRunning) {
            if (format === Format.PRETTY) {
              console.log(
                `\nStopped printing logs — sandbox is ${withUnderline(
                  'closed'
                )}`
              )
            }
            break
          }

          const lastLog = logs.length > 0 ? logs[logs.length - 1] : undefined
          if (lastLog) {
            cursor = new Date(lastLog.timestamp).getTime() + 1
          }

          await wait(400)
          isFirstRun = false
        } while (getIsRunning() && opts?.follow)
      } catch (err: any) {
        console.error(err)
        process.exit(1)
      }
    }
  )

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(2, '0').slice(0, 2)
  return `${hours}:${minutes}:${seconds}.${ms}`
}

function printLog(
  log: SandboxLogEntry,
  showTimestamp: boolean,
  format: Format | undefined
) {
  const { timestamp, eventType, message, fields } = log

  if (format === Format.JSON) {
    console.log(
      JSON.stringify({
        timestamp: new Date(timestamp).toISOString(),
        eventType,
        message,
        ...(fields && Object.keys(fields).length > 0 && { fields }),
      })
    )
    return
  }

  // Pretty format
  const timestampStr = showTimestamp
    ? chalk.default.dim(`${formatTimestamp(timestamp)}  `)
    : ''

  switch (eventType) {
    case 'process_start': {
      // Show command with $ prefix, dimmed
      const command = fields?.command || message
      console.log(`${timestampStr}${chalk.default.dim(`$ ${command}`)}`)
      break
    }
    case 'process_end': {
      // Parse exit code from fields or message
      let exitCode = 0
      let errorMsg = ''

      if (fields?.process_result) {
        try {
          const result = JSON.parse(fields.process_result)
          exitCode = result.exit_code ?? 0
          errorMsg = result.error ?? ''
        } catch {
          // Fallback to message
          exitCode = parseInt(message) || 0
        }
      }

      const exitText =
        errorMsg && exitCode !== 0
          ? `exit ${exitCode} - ${errorMsg}`
          : `exit ${exitCode}`

      if (exitCode === 0) {
        console.log(`${timestampStr}${chalk.default.green(exitText)}`)
      } else {
        console.log(`${timestampStr}${chalk.default.red(exitText)}`)
      }
      break
    }
    case 'stdout': {
      console.log(`${timestampStr}${message}`)
      break
    }
    case 'stderr': {
      console.log(`${timestampStr}${chalk.default.red(message)}`)
      break
    }
    default: {
      // Fallback for unknown event types
      console.log(`${timestampStr}${message}`)
    }
  }
}

export async function listSandboxLogs({
  sandboxID,
  cursor,
  eventType,
}: {
  sandboxID: string
  cursor?: number
  eventType?: SandboxLogEventType
}): Promise<SandboxLogEntry[]> {
  const signal = connectionConfig.getSignal()
  const res = await client.api.GET('/sandboxes/{sandboxID}/logs', {
    signal,
    params: {
      path: {
        sandboxID,
      },
      query: {
        cursor,
        eventType,
        direction: 'forward',
      },
    },
  })

  handleMoruRequestError(res, 'Error while getting sandbox logs')

  return res.data.logEntries
}
