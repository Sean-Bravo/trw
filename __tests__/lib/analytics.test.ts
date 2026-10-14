/**
 * lib/analytics.ts — GA4 events carry the acquisition attribution.
 */
import { trackEvent } from '@/lib/analytics';
import { ATTRIBUTION_COOKIE, buildAttribution, serializeAttributionCookie } from '@/lib/attribution';

describe('trackEvent', () => {
  const clearCookie = () => {
    document.cookie = `${ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`;
  };

  beforeEach(() => {
    clearCookie();
    window.gtag = jest.fn();
  });

  afterEach(() => {
    clearCookie();
    delete window.gtag;
  });

  it('is a no-op without gtag', () => {
    delete window.gtag;
    expect(() => trackEvent('bank_upload_started')).not.toThrow();
  });

  it('attaches the first-touch attribution to the event', () => {
    const attr = buildAttribution({ search: '?utm_source=google&utm_medium=cpc&utm_campaign=c1', pathname: '/bank-statement-to-csv' });
    document.cookie = `${ATTRIBUTION_COOKIE}=${serializeAttributionCookie(attr)}; Path=/`;

    trackEvent('bank_upload_completed', { detected_bank: 'Chase', transaction_count: 42 });

    expect(window.gtag).toHaveBeenCalledWith('event', 'bank_upload_completed', {
      funnel: 'bank',
      acquisition_source: 'google',
      acquisition_medium: 'cpc',
      acquisition_campaign: 'c1',
      landing_path: '/bank-statement-to-csv',
      detected_bank: 'Chase',
      transaction_count: 42,
    });
  });

  it('infers the funnel from the current page when no cookie exists, and lets params override', () => {
    window.history.pushState({}, '', '/dashboard');
    trackEvent('csv_upload_started', { file_size_kb: 12 });
    expect(window.gtag).toHaveBeenLastCalledWith('event', 'csv_upload_started', expect.objectContaining({
      funnel: 'developer', acquisition_source: 'direct', file_size_kb: 12,
    }));

    trackEvent('bank_upload_started', { funnel: 'bank' });
    expect(window.gtag).toHaveBeenLastCalledWith('event', 'bank_upload_started', expect.objectContaining({ funnel: 'bank' }));
  });
});
