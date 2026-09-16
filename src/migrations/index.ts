import * as migration_20260915_194057_initial from './20260915_194057_initial'
import * as migration_20260916_102258_media_description_shared from './20260916_102258_media_description_shared'
import * as migration_20260916_113912_translations_on_one_form from './20260916_113912_translations_on_one_form'

export const migrations = [
  {
    up: migration_20260915_194057_initial.up,
    down: migration_20260915_194057_initial.down,
    name: '20260915_194057_initial',
  },
  {
    up: migration_20260916_102258_media_description_shared.up,
    down: migration_20260916_102258_media_description_shared.down,
    name: '20260916_102258_media_description_shared',
  },
  {
    up: migration_20260916_113912_translations_on_one_form.up,
    down: migration_20260916_113912_translations_on_one_form.down,
    name: '20260916_113912_translations_on_one_form',
  },
]
