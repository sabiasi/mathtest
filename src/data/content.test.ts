import { describe, expect, it } from 'vitest'
import { allTopics, glossary, stages, type ResourceKind } from './content'
import { contentFileIds, getLesson, getQuiz } from './lessons'

/**
 * These tests check the CONTENT files (src/content/), not the app code.
 * When you add or edit a lesson, quiz or topic, run `npm test`: if you made
 * a typo (a quiz answer that doesn't exist, a link to a missing topic…),
 * one of these tests fails and its message tells you which file to fix.
 */

const topicIds = allTopics.map((topic) => topic.id)
const validKinds: ResourceKind[] = ['docs', 'course', 'video', 'interactive', 'book', 'article']

describe('roadmap.json', () => {
  it('has unique ids written in kebab-case (like "data-types")', () => {
    const ids = [...stages.map((s) => s.id), ...topicIds]
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(duplicates, 'these ids are used more than once').toEqual([])
    for (const id of ids) {
      expect(id, `"${id}" should be lowercase words joined by dashes`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  // it.each runs the same test once per topic, so a failure names the exact topic.
  it.each(allTopics)('topic "$id" has sensible fields', (topic) => {
    expect(topic.title.trim(), 'title').not.toBe('')
    expect(topic.summary.trim(), 'summary').not.toBe('')
    expect(topic.why.trim(), 'why').not.toBe('')
    expect(topic.hours, 'hours should be a positive number').toBeGreaterThan(0)
    expect(topic.resources.length, 'needs 1 to 3 resources').toBeGreaterThanOrEqual(1)
    expect(topic.resources.length, 'needs 1 to 3 resources').toBeLessThanOrEqual(3)
    for (const resource of topic.resources) {
      expect(resource.url, `resource "${resource.title}"`).toMatch(/^https:\/\//)
      expect(validKinds, `resource "${resource.title}" has an unknown kind`).toContain(resource.kind)
    }
  })

  it.each(allTopics)('topic "$id" only lists prerequisites that come earlier', (topic) => {
    const position = topicIds.indexOf(topic.id)
    for (const prerequisite of topic.prerequisites) {
      const prerequisitePosition = topicIds.indexOf(prerequisite)
      expect(prerequisitePosition, `prerequisite "${prerequisite}" doesn't exist`).not.toBe(-1)
      // "Learn this first" only makes sense if it really is first. This rule
      // also makes circular prerequisites (A needs B needs A) impossible.
      expect(
        prerequisitePosition,
        `prerequisite "${prerequisite}" comes AFTER "${topic.id}" in the roadmap`,
      ).toBeLessThan(position)
    }
  })
})

describe('lessons/ and quizzes/', () => {
  it.each(topicIds)('topic "%s" has a lesson and a quiz file', (id) => {
    expect(getLesson(id), `missing src/content/lessons/${id}.md`).toBeTruthy()
    expect(getQuiz(id), `missing src/content/quizzes/${id}.json`).toBeTruthy()
  })

  it('has no leftover files for topics that are not in roadmap.json', () => {
    const extraLessons = contentFileIds.lessons.filter((id) => !topicIds.includes(id))
    const extraQuizzes = contentFileIds.quizzes.filter((id) => !topicIds.includes(id))
    expect(extraLessons, 'lesson files with no topic').toEqual([])
    expect(extraQuizzes, 'quiz files with no topic').toEqual([])
  })

  it.each(allTopics)('quiz for "$id" is well-formed', (topic) => {
    const quiz = getQuiz(topic.id)!
    const minimum = topic.starter ? 2 : 4
    expect(quiz.questions.length, `needs at least ${minimum} questions`).toBeGreaterThanOrEqual(minimum)

    quiz.questions.forEach((question, n) => {
      const label = `question ${n + 1} ("${question.question.slice(0, 40)}…")`
      expect(question.options.length, `${label} needs 2+ options`).toBeGreaterThanOrEqual(2)
      expect(new Set(question.options).size, `${label} has duplicate options`).toBe(question.options.length)
      expect(Number.isInteger(question.answer), `${label}: answer must be a whole number`).toBe(true)
      expect(question.answer, `${label}: answer points past the last option`).toBeLessThan(question.options.length)
      expect(question.answer, `${label}: answer can't be negative`).toBeGreaterThanOrEqual(0)
      expect(question.explanation.trim(), `${label} needs an explanation`).not.toBe('')
    })
  })
})

describe('links inside lessons', () => {
  /** Finds every [text](target) Markdown link in a lesson. */
  function linkTargets(markdown: string): string[] {
    return [...markdown.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1])
  }

  it.each(topicIds)('lesson "%s" only links to glossary terms that exist', (id) => {
    const missing = linkTargets(getLesson(id)!)
      .filter((target) => target.startsWith('term:'))
      .map((target) => target.slice('term:'.length))
      .filter((termId) => !(termId in glossary))
    expect(missing, 'add these to src/content/glossary.json').toEqual([])
  })

  it.each(topicIds)('lesson "%s" only links to roadmap topics that exist', (id) => {
    const missing = linkTargets(getLesson(id)!)
      .filter((target) => target.startsWith('/roadmap/'))
      .map((target) => target.slice('/roadmap/'.length))
      .filter((topicId) => !topicIds.includes(topicId))
    expect(missing, 'these topic ids are not in roadmap.json').toEqual([])
  })
})

describe('glossary.json', () => {
  it('has a term and a definition for every entry', () => {
    for (const [id, entry] of Object.entries(glossary)) {
      expect(entry.term?.trim(), `"${id}" needs a term`).toBeTruthy()
      expect(entry.definition?.trim(), `"${id}" needs a definition`).toBeTruthy()
    }
  })
})
