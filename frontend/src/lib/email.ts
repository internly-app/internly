import { Resend } from 'resend';

const FROM_EMAIL = 'Internly <noreply@notifications.internly.tech>';

// Only initialize if API key is provided (optional for custom emails)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw new Error(error.message);
  }

  return data;
}

// Example email templates
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welcome to Internly!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Welcome to Internly, ${name}!</h1>
        <p style="color: #4a4a4a; line-height: 1.6;">
          Thanks for joining our community. You can now browse internship reviews,
          share your own experiences, and help fellow students make informed career decisions.
        </p>
        <a href="https://internly.tech/reviews"
           style="display: inline-block; background: #000; color: #fff; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Browse Reviews
        </a>
      </div>
    `,
    text: `Welcome to Internly, ${name}! Thanks for joining our community.`,
  }),
};
