import { expect, it } from 'vitest';
import { checkTranslations } from '../../scripts/i18n-check.mjs';
import { setLanguage, t } from './index.js';
it('has complete keys and matching interpolation in all locales', async () => expect(await checkTranslations()).toEqual([]));
it('uses setting before browser preference and falls back to English', () => { setLanguage('ja', 'ko-KR'); expect(t('start')).toBe('チューニング開始'); setLanguage('auto', 'fr-FR'); expect(t('start')).toBe('Start tuning'); setLanguage('ko'); });
