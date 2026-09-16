import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'

import EmbeddedPostgres from 'embedded-postgres'

export type EmbeddedDb = {
  connectionString: string
  port: number
  stop: () => Promise<void>
}

export type EmbeddedDbOptions = {
  /** Directory holding the cluster files (created on first use). */
  dir: string
  /** Fixed port, or 0 to pick a free port. */
  port?: number
  database?: string
  user?: string
  password?: string
  /** Delete the data directory first. */
  reset?: boolean
  quiet?: boolean
}

/** Defaults matching .env.example; a local .env may override them (see fromConnectionString). */
export const LOCAL_DB_DEFAULTS = {
  user: 'starlight',
  password: 'starlight-local-dev',
  database: 'starlight_jewellery',
  port: 54329,
} as const

/**
 * Reads user, password, database and port from a local connection string so the cluster
 * is created with whatever the developer's .env expects.
 */
export function fromConnectionString(
  uri: string | undefined,
): Partial<Pick<EmbeddedDbOptions, 'user' | 'password' | 'database' | 'port'>> {
  if (!uri) {
    return {}
  }
  try {
    const url = new URL(uri)
    return {
      user: decodeURIComponent(url.username) || undefined,
      password: decodeURIComponent(url.password) || undefined,
      database: url.pathname.replace(/^\//, '') || undefined,
      port: url.port ? Number.parseInt(url.port, 10) : undefined,
    }
  } catch {
    return {}
  }
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

/** True when something already accepts connections on the port (an earlier cluster, usually). */
function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    socket.unref()
    socket.setTimeout(1500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(false))
  })
}

/** Reads the process id and port from a cluster's lock file, if any. */
function lockInfo(dir: string): { pid: number; port: number | null } | null {
  try {
    const lines = fs.readFileSync(path.join(dir, 'postmaster.pid'), 'utf8').split('\n')
    const pid = Number.parseInt((lines[0] ?? '').trim(), 10)
    const port = Number.parseInt((lines[3] ?? '').trim(), 10)
    return Number.isInteger(pid) && pid > 0
      ? { pid, port: Number.isInteger(port) ? port : null }
      : null
  } catch {
    return null
  }
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Starts a local PostgreSQL 17 cluster from the `embedded-postgres` npm package. No
 * system installation is needed: the binaries ship with the package for macOS (Intel and
 * Apple Silicon), Linux and Windows.
 */
export async function startEmbeddedPostgres(options: EmbeddedDbOptions): Promise<EmbeddedDb> {
  const dir = path.resolve(options.dir)
  const database = options.database ?? LOCAL_DB_DEFAULTS.database
  const user = options.user ?? LOCAL_DB_DEFAULTS.user
  const password = options.password ?? LOCAL_DB_DEFAULTS.password
  const port = options.port && options.port > 0 ? options.port : await freePort()

  if (options.reset && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  const firstRun = !fs.existsSync(path.join(dir, 'PG_VERSION'))
  fs.mkdirSync(dir, { recursive: true })

  // The last lines PostgreSQL wrote, so a failed start can be explained even in quiet mode.
  const recent: string[] = []
  const log = (m: string) => {
    for (const line of m.split('\n')) {
      if (line.trim()) {
        recent.push(line.trim())
        if (recent.length > 20) {
          recent.shift()
        }
      }
    }
    if (!options.quiet) {
      process.stdout.write(`[postgres] ${m}\n`)
    }
  }
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user,
    password,
    port,
    persistent: true,
    // Postgres refuses to run as root (containers/CI); a helper user is created there.
    createPostgresUser: typeof process.getuid === 'function' && process.getuid() === 0,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    postgresFlags: ['-c', 'listen_addresses=127.0.0.1', '-c', 'log_min_messages=warning'],
    onLog: log,
    onError: (m) => process.stderr.write(`[postgres] ${String(m).trim()}\n`),
  })

  const lock = lockInfo(dir)
  if (await portInUse(port)) {
    if (lock && lock.port === port && processAlive(lock.pid)) {
      // The cluster from an earlier `pnpm dev` is still running with this data directory:
      // reuse it instead of failing (it stays running after this process exits).
      const connectionString = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`
      process.stdout.write(
        `Reusing the local PostgreSQL that is already running on port ${port} (process ${lock.pid}).\n`,
      )
      return { connectionString, port, stop: async () => undefined }
    }
    throw new Error(
      [
        `Port ${port} is already in use, so the local database cannot start.`,
        'If an earlier `pnpm dev` or `pnpm db:start` is still running in another Terminal window or tab, stop it there with Ctrl+C and try again.',
        `Otherwise find what is using the port with:  lsof -nP -iTCP:${port} -sTCP:LISTEN`,
        'or choose another port by setting LOCAL_PG_PORT (and the port in DATABASE_URI) in .env.',
      ].join('\n'),
    )
  }
  // A lock file left behind by a crash (no live process) would stop PostgreSQL from starting.
  if (lock && !processAlive(lock.pid)) {
    fs.rmSync(path.join(dir, 'postmaster.pid'), { force: true })
  }

  if (firstRun) {
    await pg.initialise()
  }
  try {
    await pg.start()
  } catch (error) {
    const detail = error instanceof Error ? error.message : recent.join('\n')
    throw new Error(
      [
        `PostgreSQL failed to start (data directory ${dir}, port ${port}).`,
        detail ? `Last messages:\n${detail}` : 'PostgreSQL exited without a message.',
        'If the database was created by a different version of this project, `pnpm db:reset` recreates it (local sample data is lost).',
      ].join('\n'),
    )
  }
  if (firstRun) {
    await pg.createDatabase(database)
  } else {
    // Make sure the database exists even when the cluster was reset by hand.
    const client = pg.getPgClient('postgres', '127.0.0.1')
    await client.connect()
    try {
      const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])
      if (res.rowCount === 0) {
        await client.query(`CREATE DATABASE "${database}"`)
      }
    } finally {
      await client.end()
    }
  }

  const connectionString = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`
  let stopped = false
  return {
    connectionString,
    port,
    stop: async () => {
      if (stopped) {
        return
      }
      stopped = true
      await pg.stop()
    },
  }
}
