import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  template: 'report_submitted' | 'report_approved' | 'report_revision' | 'budget_alert';
  data: {
    recipientName?: string;
    employeeName?: string;
    clientName?: string;
    serviceName?: string;
    weekDate?: string;
    feedback?: string;
    budgetAmount?: string;
    spentAmount?: string;
    reportLink?: string;
  };
}

const templates = {
  report_submitted: (data: EmailRequest['data']) => ({
    subject: `New Report Submitted - ${data.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">New Weekly Report Submitted</h2>
        <p>Hello ${data.recipientName || 'Admin'},</p>
        <p><strong>${data.employeeName}</strong> has submitted a new weekly report for review.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Client:</strong> ${data.clientName}</p>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceName}</p>
          <p style="margin: 5px 0;"><strong>Week of:</strong> ${data.weekDate}</p>
        </div>
        <p>Please log in to review and approve this report.</p>
        ${data.reportLink ? `<p><a href="${data.reportLink}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Report</a></p>` : ''}
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This is an automated notification from ClientFlow.</p>
      </div>
    `,
  }),

  report_approved: (data: EmailRequest['data']) => ({
    subject: `Report Approved - ${data.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Report Approved!</h2>
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Hello ${data.recipientName || 'Team Member'},</p>
          <p>Great news! Your weekly report has been approved.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Client:</strong> ${data.clientName}</p>
            <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceName}</p>
            <p style="margin: 5px 0;"><strong>Week of:</strong> ${data.weekDate}</p>
          </div>
          ${data.feedback ? `
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 0;"><strong>Feedback:</strong></p>
              <p style="margin: 10px 0 0 0;">${data.feedback}</p>
            </div>
          ` : ''}
          <p>Keep up the excellent work!</p>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This is an automated notification from ClientFlow.</p>
      </div>
    `,
  }),

  report_revision: (data: EmailRequest['data']) => ({
    subject: `Revision Requested - ${data.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Revision Requested</h2>
        </div>
        <div style="background: #fffbeb; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Hello ${data.recipientName || 'Team Member'},</p>
          <p>Your weekly report requires some revisions before it can be approved.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Client:</strong> ${data.clientName}</p>
            <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceName}</p>
            <p style="margin: 5px 0;"><strong>Week of:</strong> ${data.weekDate}</p>
          </div>
          ${data.feedback ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;"><strong>Requested Changes:</strong></p>
              <p style="margin: 10px 0 0 0;">${data.feedback}</p>
            </div>
          ` : ''}
          <p>Please log in to make the necessary updates and resubmit your report.</p>
          ${data.reportLink ? `<p><a href="${data.reportLink}" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Edit Report</a></p>` : ''}
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This is an automated notification from ClientFlow.</p>
      </div>
    `,
  }),

  budget_alert: (data: EmailRequest['data']) => ({
    subject: `Budget Alert - ${data.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Budget Alert!</h2>
        </div>
        <div style="background: #fef2f2; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Hello ${data.recipientName || 'Admin'},</p>
          <p>A client budget has exceeded 80% of the allocated amount.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Client:</strong> ${data.clientName}</p>
            <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceName}</p>
            <p style="margin: 5px 0;"><strong>Budget:</strong> ${data.budgetAmount}</p>
            <p style="margin: 5px 0;"><strong>Spent:</strong> ${data.spentAmount}</p>
          </div>
          <p>Please review the budget allocation and adjust as necessary.</p>
          <p style="color: #dc2626; font-weight: bold;">⚠️ Action may be required to prevent budget overrun.</p>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This is an automated notification from ClientFlow.</p>
      </div>
    `,
  }),
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const emailRequest: EmailRequest = await req.json();

    if (!emailRequest.to || !emailRequest.template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, template' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const templateData = templates[emailRequest.template];
    if (!templateData) {
      return new Response(
        JSON.stringify({ error: 'Invalid template type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const emailContent = templateData(emailRequest.data || {});

    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ClientFlow <notifications@clientflow.app>',
          to: [emailRequest.to],
          subject: emailContent.subject,
          html: emailContent.html,
        }),
      });

      if (!resendResponse.ok) {
        throw new Error(`Resend API error: ${await resendResponse.text()}`);
      }

      const result = await resendResponse.json();

      return new Response(
        JSON.stringify({ success: true, messageId: result.id }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.log('Email would be sent:', {
        to: emailRequest.to,
        subject: emailContent.subject,
        template: emailRequest.template,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email logged (RESEND_API_KEY not configured)',
          data: emailContent
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    console.error('Error sending email:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
