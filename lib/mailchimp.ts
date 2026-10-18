import mailchimp from '@mailchimp/mailchimp_marketing';

// Initialize Mailchimp configuration
export function initializeMailchimp() {
  if (!process.env['MAILCHIMP_API_KEY'] || !process.env['MAILCHIMP_SERVER_PREFIX']) {
    throw new Error('Mailchimp API key and server prefix are required');
  }

  mailchimp.setConfig({
    apiKey: process.env['MAILCHIMP_API_KEY'],
    server: process.env['MAILCHIMP_SERVER_PREFIX'],
  });

  return mailchimp;
}

// SDK errors carry the superagent response, whose request holds the
// `Authorization: Basic` header (the API key). Never log the raw error; log this.
export function describeMailchimpError(error: unknown): {
  status?: number;
  title?: string;
  detail?: string;
  message?: string;
} {
  const err = (error ?? {}) as {
    status?: unknown;
    message?: unknown;
    response?: { status?: unknown; body?: { title?: unknown; detail?: unknown } };
  };
  const status = err.status ?? err.response?.status;
  const title = err.response?.body?.title;
  const detail = err.response?.body?.detail;

  return {
    ...(typeof status === 'number' && { status }),
    ...(typeof title === 'string' && { title }),
    ...(typeof detail === 'string' && { detail }),
    ...(typeof err.message === 'string' && { message: err.message }),
  };
}

// Check if Mailchimp is properly configured
export function isMailchimpConfigured(): boolean {
  return !!(
    process.env['MAILCHIMP_API_KEY'] &&
    process.env['MAILCHIMP_SERVER_PREFIX'] &&
    process.env['MAILCHIMP_AUDIENCE_ID']
  );
}

// Add a subscriber to the Mailchimp audience
export async function addSubscriber(
  email: string,
  options?: {
    tags?: string[];
    mergeFields?: Record<string, string>;
    firstName?: string;
    lastName?: string;
  }
) {
  const mc = initializeMailchimp();

  if (!process.env['MAILCHIMP_AUDIENCE_ID']) {
    throw new Error('Mailchimp audience ID is required');
  }

  const mergeFields: Record<string, string> = {
    SOURCE: 'TaxFormatter Website',
    SIGNUP_DATE: new Date().toISOString().split('T')[0] ?? '',
    ...options?.mergeFields,
  };

  if (options?.firstName) {
    mergeFields['FNAME'] = options.firstName;
  }

  if (options?.lastName) {
    mergeFields['LNAME'] = options.lastName;
  }

  try {
    const response = await mc.lists.addListMember(process.env['MAILCHIMP_AUDIENCE_ID'], {
      email_address: email,
      status: 'subscribed',
      tags: options?.tags || ['website-signup'],
      merge_fields: mergeFields,
    });

    return {
      success: true,
      id: response.id,
      email: response.email_address,
    };
  } catch (error: any) {
    // Handle "already subscribed" case
    if (error.response?.body?.title === 'Member Exists') {
      return {
        success: true,
        alreadySubscribed: true,
        message: 'Email is already subscribed',
      };
    }

    throw error;
  }
}

// Get subscriber information
export async function getSubscriber(email: string) {
  const mc = initializeMailchimp();

  if (!process.env['MAILCHIMP_AUDIENCE_ID']) {
    throw new Error('Mailchimp audience ID is required');
  }

  try {
    const response = await mc.lists.getListMember(
      process.env['MAILCHIMP_AUDIENCE_ID'],
      email
    );

    return {
      success: true,
      status: response.status,
      email: response.email_address,
      tags: response.tags,
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return {
        success: false,
        notFound: true,
        message: 'Subscriber not found',
      };
    }

    throw error;
  }
}

// Update subscriber tags
export async function updateSubscriberTags(
  email: string,
  tags: Array<{ name: string; status: 'active' | 'inactive' }>
) {
  const mc = initializeMailchimp();

  if (!process.env['MAILCHIMP_AUDIENCE_ID']) {
    throw new Error('Mailchimp audience ID is required');
  }

  try {
    await mc.lists.updateListMemberTags(
      process.env['MAILCHIMP_AUDIENCE_ID'],
      email,
      { tags }
    );

    return { success: true };
  } catch (error) {
    throw error;
  }
}
