/**
 * Mailchimp SDK errors carry the superagent response, whose request holds the
 * `Authorization: Basic` header (the API key). The waitlist and subscribe
 * routes must never log or report that object.
 */

jest.mock('@mailchimp/mailchimp_marketing', () => ({
  __esModule: true,
  default: {
    setConfig: jest.fn(),
    lists: { addListMember: jest.fn() },
  },
}));
jest.mock('@/lib/sentry', () => ({
  captureException: jest.fn(),
  setContext: jest.fn(),
}));

import { inspect } from 'util';
import mailchimp from '@mailchimp/mailchimp_marketing';
import { captureException } from '@/lib/sentry';
import { describeMailchimpError } from '@/lib/mailchimp';
import { POST as waitlistPOST } from '@/app/api/waitlist/route';
import { POST as subscribePOST } from '@/app/api/subscribe/route';
import { createMockRequest } from '../utils/mock-request';

const FAKE_AUTH = 'Basic dXNlcjpGQUtFLUtFWS1kby1ub3QtbG9nLXVzMQ==';

const addListMember = (mailchimp as any).lists.addListMember as jest.Mock;
const mockedCapture = captureException as jest.MockedFunction<typeof captureException>;

// Shaped like a superagent error: err.response.request is the Request with its headers
function sdkError(status: number, title: string, detail: string) {
  const err: any = new Error(title === 'Member Exists' ? 'Bad Request' : 'Unauthorized');
  err.status = status;
  err.response = {
    status,
    body: { title, detail, status },
    request: { method: 'POST', header: { Authorization: FAKE_AUTH } },
    req: { _header: `POST /3.0/lists/x/members HTTP/1.1\r\nAuthorization: ${FAKE_AUTH}\r\n` },
  };
  return err;
}

function everythingLogged(spy: jest.SpyInstance): string {
  return spy.mock.calls.map((args) => args.map((a: unknown) => inspect(a, { depth: 10 })).join(' ')).join('\n');
}

describe('Mailchimp error logging', () => {
  const OLD_ENV = process.env;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      MAILCHIMP_API_KEY: 'fake-key-us1',
      MAILCHIMP_SERVER_PREFIX: 'us1',
      MAILCHIMP_AUDIENCE_ID: 'aud123',
    };
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('describeMailchimpError', () => {
    it('keeps only status, title, detail and message', () => {
      const safe = describeMailchimpError(sdkError(401, 'API Key Invalid', 'Your API key may be invalid.'));
      expect(safe).toEqual({
        status: 401,
        title: 'API Key Invalid',
        detail: 'Your API key may be invalid.',
        message: 'Unauthorized',
      });
      expect(inspect(safe)).not.toContain(FAKE_AUTH);
    });

    it('handles non-Error values', () => {
      expect(describeMailchimpError(undefined)).toEqual({});
      expect(describeMailchimpError('boom')).toEqual({});
    });
  });

  describe('POST /api/waitlist', () => {
    it('does not log or report the Authorization header', async () => {
      addListMember.mockRejectedValue(sdkError(401, 'API Key Invalid', 'Your API key may be invalid.'));

      const res = await waitlistPOST(createMockRequest({ email: 'a@example.com' }) as any);

      expect(res.status).toBe(500);
      expect(errorSpy).toHaveBeenCalled();
      const logged = everythingLogged(errorSpy);
      expect(logged).toContain('API Key Invalid');
      expect(logged).not.toContain(FAKE_AUTH);

      expect(mockedCapture).toHaveBeenCalledTimes(1);
      const reported = mockedCapture.mock.calls[0]![0] as any;
      expect(reported).toBeInstanceOf(Error);
      expect(reported.response).toBeUndefined();
      expect(inspect(reported, { depth: 10 })).not.toContain(FAKE_AUTH);
    });
  });

  describe('POST /api/subscribe', () => {
    it('does not log the Authorization header on a Mailchimp error', async () => {
      addListMember.mockRejectedValue(sdkError(401, 'API Key Invalid', 'Your API key may be invalid.'));

      const res = await subscribePOST(createMockRequest({ email: 'a@example.com' }) as any);

      expect(res.status).toBe(401);
      expect(errorSpy).toHaveBeenCalled();
      const logged = everythingLogged(errorSpy);
      expect(logged).toContain('API Key Invalid');
      expect(logged).not.toContain(FAKE_AUTH);
    });

    it('does not log at all for an existing member', async () => {
      addListMember.mockRejectedValue(sdkError(400, 'Member Exists', 'a@example.com is already a list member.'));

      const res = await subscribePOST(createMockRequest({ email: 'a@example.com' }) as any);

      expect(res.status).toBe(200);
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
