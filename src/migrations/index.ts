import * as migration_20260915_194057_initial from './20260915_194057_initial'

export const migrations = [
  {
    up: migration_20260915_194057_initial.up,
    down: migration_20260915_194057_initial.down,
    name: '20260915_194057_initial',
  },
]
