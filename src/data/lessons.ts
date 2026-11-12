/**
 * Loads every lesson (Markdown) and quiz (JSON) from src/content/.
 *
 * Why a separate file from content.ts? Size. Together these files are about
 * 170 kB of text, and only the topic page needs them. Pages like Home only
 * import content.ts (the roadmap and glossary), so with lessons kept here, Vite
 * puts all this text into the topic page's own download instead of the main
 * one everybody loads first.
 */
import type { Quiz } from './content'

/*
  import.meta.glob is a Vite feature: it finds every file matching a pattern
  at build time. So adding lessons/my-topic.md is enough for the app to see it,
  with no import line to write.
    query '?raw'  → give us the file's text, not a module
    eager: true   → bundle them all together (they're small one by one)
*/
const lessonFiles = import.meta.glob<string>('../content/lessons/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const quizFiles = import.meta.glob<Quiz>('../content/quizzes/*.json', {
  import: 'default',
  eager: true,
})

/** "../content/lessons/variables.md" → "variables" */
function fileId(path: string): string {
  return path.split('/').pop()!.replace(/\.(md|json)$/, '')
}

function byFileId<T>(files: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(files).map(([path, value]) => [fileId(path), value]))
}

const lessonsById = byFileId(lessonFiles)
const quizzesById = byFileId(quizFiles)

export function getLesson(topicId: string): string | undefined {
  return lessonsById[topicId]
}

export function getQuiz(topicId: string): Quiz | undefined {
  return quizzesById[topicId]
}

/** Exposed for the content test, which checks every file is used. */
export const contentFileIds = {
  lessons: Object.keys(lessonsById),
  quizzes: Object.keys(quizzesById),
}
