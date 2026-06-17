/**
 * Unit tests for the per-turn reply-language directive.
 * The reported failure: a German-locale browser user who types English got a
 * German answer. These lock the detector for the en/de cases that matter.
 */

import { detectReplyLanguage, buildReplyLanguageDirective } from '@/services/cat/reply-language';

describe('detectReplyLanguage', () => {
  it('detects clearly English short messages (the regression case)', () => {
    expect(detectReplyLanguage('i just do it at home for now, but wanna play gigs')).toBe('en');
    expect(detectReplyLanguage('friends and friends of friends')).toBe('en');
    expect(detectReplyLanguage('weekends')).toBe('en');
    expect(detectReplyLanguage("I'm a dj")).toBe('en');
  });

  it('detects German via stopwords and umlauts/ß', () => {
    expect(detectReplyLanguage('ich möchte am Wochenende auflegen')).toBe('de');
    expect(detectReplyLanguage('das ist gut, danke')).toBe('de');
    expect(detectReplyLanguage('Größe')).toBe('de');
  });

  it('returns unknown when there is no signal either way', () => {
    expect(detectReplyLanguage('DJ 2026')).toBe('unknown');
    expect(detectReplyLanguage('🎧🎶')).toBe('unknown');
  });
});

describe('buildReplyLanguageDirective', () => {
  it('names English for English input', () => {
    const d = buildReplyLanguageDirective('friends and friends of friends');
    expect(d).toContain('English');
    expect(d.toLowerCase()).toContain('entire reply');
  });

  it('names German for German input', () => {
    const d = buildReplyLanguageDirective('ich möchte das machen');
    expect(d).toContain('German');
  });

  it('falls back to a generic match-the-user reminder when unknown', () => {
    const d = buildReplyLanguageDirective('DJ 2026');
    expect(d.toLowerCase()).toContain('same language');
  });
});
