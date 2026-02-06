import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  to: string;
  subject: string;
  message: string;
  html?: string;
  type: 'email' | 'system';
  template_id?: string;
}

interface EmailLog {
  recipient_email: string;
  subject: string;
  template_id: string | null;
  status: 'sent' | 'failed';
  sent_at: string;
  error_message: string | null;
}

async function sendEmail(to: string, subject: string, message: string, html?: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'ClientFlow <noreply@clientflow.app>',
        to: [to],
        subject: subject,
        text: message,
        html: html || `<p>${message}</p>`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email service error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

async function logEmailToDatabase(log: EmailLog, supabaseUrl: string, supabaseKey: string) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(log),
    });

    if (!response.ok) {
      console.error('Failed to log email to database');
    }
  } catch (error) {
    console.error('Database logging error:', error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, message, html, type, template_id }: NotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (type === 'email') {
      const emailResult = await sendEmail(to, subject, message, html);

      await logEmailToDatabase({
        recipient_email: to,
        subject: subject,
        template_id: template_id || null,
        status: 'sent',
        sent_at: new Date().toISOString(),
        error_message: null,
      }, supabaseUrl, supabaseKey);

      return new Response(
        JSON.stringify({ success: true, message: 'Email sent successfully', id: emailResult.id }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    } else {
      await fetch(`${supabaseUrl}/rest/v1/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: to,
          title: subject,
          message: message,
          type: 'system',
          is_read: false,
          created_at: new Date().toISOString(),
        }),
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Notification created' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    }
  } catch (error) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseKey) {
      await logEmailToDatabase({
        recipient_email: 'error@clientflow.app',
        subject: 'Email send failure',
        template_id: null,
        status: 'failed',
        sent_at: new Date().toISOString(),
        error_message: error.message,
      }, supabaseUrl, supabaseKey);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});
