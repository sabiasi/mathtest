import { createLocalStorageRepository } from './localStorageRepository'
import type { DevPathRepository } from './repository'

/**
 * THE repository the whole app uses. This is the one line to change when
 * DevPath gets a real database:
 *   export const repo = createApiRepository('https://…')
 */
export const repo: DevPathRepository = createLocalStorageRepository(window.localStorage)

export type { DevPathRepository } from './repository'
export type * from './types'
