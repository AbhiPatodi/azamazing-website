import { Router } from 'itty-router';
import nodemailer from 'nodemailer';

const router = Router();

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle CORS preflight
router.options('/api/contact', () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
});

// Handle form submission
router.post('/api/contact', async (request: Request, env: any) => {
  try {
    // Parse form data
    const contentType = request.headers.get('content-type');
    let formData: ContactFormData;

    if (contentType?.includes('application/json')) {
      formData = await request.json();
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const data = await request.text();
      const params = new URLSearchParams(data);
      formData = {
        name: params.get('name') || '',
        email: params.get('email') || '',
        subject: params.get('subject') || '',
        message: params.get('message') || '',
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid content type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate required fields
    if (!formData.name || !formData.email || !formData.message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Send email via Google SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: env.GMAIL_USER || 'azamazingltd@gmail.com',
        pass: env.GMAIL_APP_PASSWORD,
      },
    });

    try {
      await transporter.sendMail({
        from: `"Azamazing Group" <${env.GMAIL_USER || 'azamazingltd@gmail.com'}>`,
        to: 'shreyansh@azamazinggroup.com',
        replyTo: formData.email,
        subject: formData.subject || 'New Contact Form Submission',
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(formData.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(formData.email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(formData.subject)}</p>
          <hr />
          <h3>Message:</h3>
          <p>${escapeHtml(formData.message).replace(/\n/g, '<br>')}</p>
        `,
      });
    } catch (emailError) {
      console.error('Gmail SMTP error:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  fetch: router.handle,
};
