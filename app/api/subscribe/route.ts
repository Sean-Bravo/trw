import { NextRequest, NextResponse } from 'next/server';
import mailchimp from '@mailchimp/mailchimp_marketing';
import { validateEmail } from '@/lib/validation';

// Configure Mailchimp
mailchimp.setConfig({
  apiKey: process.env['MAILCHIMP_API_KEY'],
  server: process.env['MAILCHIMP_SERVER_PREFIX'], // e.g., 'us1', 'us6', etc.
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const validation = validateEmail(email);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error || 'Invalid email format' },
        { status: 400 }
      );
    }

    const validatedEmail = validation.data as string;

    // Check for required environment variables
    if (!process.env['MAILCHIMP_API_KEY'] || !process.env['MAILCHIMP_AUDIENCE_ID']) {
      console.error('Missing Mailchimp configuration');
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      );
    }

    // Add subscriber to Mailchimp audience
    const response = await mailchimp.lists.addListMember(
      process.env['MAILCHIMP_AUDIENCE_ID'],
      {
        email_address: validatedEmail,
        status: 'subscribed',
        tags: ['website-signup'],
        merge_fields: {
          SOURCE: 'TaxFormatter Website',
          SIGNUP_DATE: new Date().toISOString().split('T')[0] ?? '',
        },
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed to newsletter',
        id: response.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Mailchimp subscription error:', error);

    // Handle specific Mailchimp errors
    if (error.response) {
      const { status, body } = error.response;

      // Already subscribed
      if (status === 400 && body?.title === 'Member Exists') {
        return NextResponse.json(
          {
            success: true,
            message: 'This email is already subscribed',
          },
          { status: 200 }
        );
      }

      // Invalid email or other Mailchimp errors
      return NextResponse.json(
        {
          error: body?.detail || 'Failed to subscribe',
        },
        { status: status || 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
