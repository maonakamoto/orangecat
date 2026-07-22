/**
 * parseJsonLoose — the defensive parser between raw model output and the writing
 * engine. Model JSON is unpredictable (code fences, leading prose), so this must
 * be forgiving without ever throwing.
 */
import { parseJsonLoose } from '@/services/cat/platform-llm';

describe('parseJsonLoose', () => {
  it('parses clean JSON objects and arrays', () => {
    expect(parseJsonLoose('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonLoose('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('strips ```json fences', () => {
    expect(parseJsonLoose('```json\n{"topics":[]}\n```')).toEqual({ topics: [] });
    expect(parseJsonLoose('```\n{"x":true}\n```')).toEqual({ x: true });
  });

  it('recovers JSON embedded in prose', () => {
    const raw = 'Sure! Here are your topics: {"topics":[{"title":"Hi"}]} Hope that helps.';
    expect(parseJsonLoose<{ topics: unknown[] }>(raw)?.topics).toHaveLength(1);
  });

  it('returns null (never throws) on unparseable or empty input', () => {
    expect(parseJsonLoose(null)).toBeNull();
    expect(parseJsonLoose('')).toBeNull();
    expect(parseJsonLoose('not json at all')).toBeNull();
    expect(parseJsonLoose('{ broken ')).toBeNull();
  });
});
