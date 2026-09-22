// Supabase Edge Function: notify-new-order
// Automatically sends email alerts for new orders via Resend API (https://api.resend.com/emails)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured in Edge Function Secrets');
      return new Response(
        JSON.stringify({
          error: 'RESEND_API_KEY secret is not set in Supabase Edge Function secrets',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Recipient email: Defaults to the user email registered with Resend
    const toEmail =
      Deno.env.get('TO_EMAIL') ||
      Deno.env.get('NOTIFICATION_EMAIL') ||
      'akashprogofficial@gmail.com';

    // Parse the payload (supports both Database Webhook and Direct Call)
    const body = await req.json().catch(() => ({}));
    
    // If triggered by a Supabase Database Webhook, data is in body.record
    const orderData = body.record || body.order || body;

    const orderId = orderData.id || orderData.order_id || `ORD-${Date.now().toString().slice(-4)}`;
    const customerName = orderData.customer_name || 'Valued Customer';
    const customerPhone = orderData.customer_phone || 'N/A';
    const customerAddress = orderData.customer_address || 'N/A';
    const deliveryLocation = orderData.delivery_location === 'outside_dhaka'
      ? 'Outside Dhaka (৳130)'
      : 'Inside Dhaka (৳70)';
    const deliveryCharge = Number(orderData.delivery_charge ?? (orderData.delivery_location === 'outside_dhaka' ? 130 : 70));
    const subtotal = Number(orderData.subtotal ?? 0);
    const total = Number(orderData.total ?? (subtotal + deliveryCharge));
    const paymentMethodRaw = (orderData.payment_method || 'cod').toLowerCase();
    const paymentMethodMap: Record<string, string> = {
      cod: 'Cash on Delivery',
      bkash: 'bKash Mobile Payment',
      nagad: 'Nagad Mobile Payment',
      whatsapp: 'Order via WhatsApp',
    };
    const paymentMethod = paymentMethodMap[paymentMethodRaw] || paymentMethodRaw.toUpperCase();
    const transactionId = orderData.transaction_id || null;
    const notes = orderData.notes || '';
    const createdAt = orderData.created_at
      ? new Date(orderData.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });

    // Resolve order items: check payload first, otherwise query order_items table
    let items: Array<{ product_name: string; quantity: number; unit_price: number }> =
      Array.isArray(orderData.items) ? orderData.items : [];

    if (items.length === 0 && orderData.id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
      
      if (supabaseUrl && supabaseKey) {
        try {
          // Allow 600ms for child order_items row insertion to complete
          await new Promise((res) => setTimeout(res, 600));
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: dbItems } = await supabase
            .from('order_items')
            .select('product_name, quantity, unit_price')
            .eq('order_id', orderData.id);

          if (dbItems && dbItems.length > 0) {
            items = dbItems;
          }
        } catch (dbErr) {
          console.warn('Could not fetch child order_items:', dbErr);
        }
      }
    }

    // Build Items HTML table
    const itemsHtml = items.length > 0
      ? items
          .map(
            (it) => `
          <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 12px 8px; font-weight: 600; color: #1e293b;">${it.product_name || 'Eyewear Frame'}</td>
            <td style="padding: 12px 8px; text-align: center; color: #475569;">x${it.quantity}</td>
            <td style="padding: 12px 8px; text-align: right; color: #475569;">৳${Number(it.unit_price).toLocaleString()}</td>
            <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #0f172a;">৳${(Number(it.quantity) * Number(it.unit_price)).toLocaleString()}</td>
          </tr>`
          )
          .join('')
      : `<tr><td colspan="4" style="padding: 14px 8px; text-align: center; color: #64748b; font-style: italic;">Items recorded in Defence Optics Admin Dashboard</td></tr>`;

    // Transaction ID banner if payment is bKash / Nagad
    const transactionIdBadge = transactionId
      ? `<div style="margin-top: 6px; padding: 6px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #065f46; font-size: 13px; font-family: monospace;">
          <strong>Transaction ID:</strong> ${transactionId}
        </div>`
      : '';

    // Customer notes block
    const notesHtml = notes
      ? `<div style="margin-top: 16px; padding: 12px 14px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 13px; color: #92400e;">
          <strong>Customer Note:</strong> ${notes}
        </div>`
      : '';

    // Full HTML Email Template
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order — Defence Optics</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Top Header -->
    <div style="background-color: #0f172a; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
        DEFENCE OPTICS
      </h1>
      <p style="margin: 6px 0 0 0; color: #d4a347; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">
        🛒 New Order Received
      </p>
    </div>

    <!-- Order Header Bar -->
    <div style="background-color: #f8fafc; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Order ID</span>
        <div style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace;">${orderId}</div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 12px; color: #64748b;">Order Placed:</span>
        <div style="font-size: 13px; font-weight: 600; color: #334155;">${createdAt} BST</div>
      </div>
    </div>

    <div style="padding: 24px;">
      <!-- Customer Information Card -->
      <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 16px 18px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 13px; color: #a87d33; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">
          Customer & Delivery Details
        </h3>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 110px;">Name:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Phone:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">
              <a href="tel:${customerPhone}" style="color: #0284c7; text-decoration: none;">${customerPhone}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Location:</td>
            <td style="padding: 4px 0; color: #334155; font-weight: 600;">${deliveryLocation}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; vertical-align: top;">Address:</td>
            <td style="padding: 4px 0; color: #334155; line-height: 1.4;">${customerAddress}</td>
          </tr>
        </table>
      </div>

      <!-- Payment Details Card -->
      <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 16px 18px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 13px; color: #a87d33; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">
          Payment Method
        </h3>
        <div style="font-size: 15px; font-weight: 700; color: #0f172a;">
          ${paymentMethod}
        </div>
        ${transactionIdBadge}
      </div>

      <!-- Items Ordered Table -->
      <h3 style="margin: 0 0 12px 0; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">
        Ordered Products (${items.length || '1'} item${items.length === 1 ? '' : 's'})
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f1f5f9; text-transform: uppercase; font-size: 11px; color: #475569; letter-spacing: 0.05em;">
            <th style="padding: 10px 8px; text-align: left;">Product</th>
            <th style="padding: 10px 8px; text-align: center; width: 60px;">Qty</th>
            <th style="padding: 10px 8px; text-align: right; width: 80px;">Price</th>
            <th style="padding: 10px 8px; text-align: right; width: 90px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Order Totals Box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Subtotal:</td>
            <td style="padding: 4px 0; text-align: right; color: #334155; font-weight: 600;">৳${subtotal.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Delivery Fee:</td>
            <td style="padding: 4px 0; text-align: right; color: #334155; font-weight: 600;">৳${deliveryCharge.toLocaleString()}</td>
          </tr>
          <tr style="border-top: 2px solid #cbd5e1;">
            <td style="padding: 10px 0 0 0; font-size: 17px; font-weight: 800; color: #0f172a;">Grand Total:</td>
            <td style="padding: 10px 0 0 0; text-align: right; font-size: 20px; font-weight: 800; color: #d97706;">৳${total.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      ${notesHtml}

      <!-- Quick Action: Call Customer or View Dashboard -->
      <div style="margin-top: 24px; text-align: center;">
        <a href="tel:${customerPhone}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-right: 8px;">
          📞 Call Customer (${customerPhone})
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      This email was automatically generated by Defence Optics order notification system via Resend.
    </div>

  </div>
</body>
</html>
`;

    // Plain text fallback
    const itemsText = items.length > 0
      ? items.map((i) => `* ${i.product_name} (x${i.quantity}) - ৳${i.unit_price}`).join('\n')
      : 'Items recorded in Defence Optics Admin Dashboard';

    const emailText = `
NEW ORDER ON DEFENCE OPTICS — ${orderId}
------------------------------------------------
Order ID: ${orderId}
Customer: ${customerName}
Phone: ${customerPhone}
Delivery Address: ${customerAddress} (${deliveryLocation})
Payment Method: ${paymentMethod} ${transactionId ? `[Trx ID: ${transactionId}]` : ''}

ITEMS:
${itemsText}

Subtotal: ৳${subtotal}
Delivery Charge: ৳${deliveryCharge}
GRAND TOTAL: ৳${total}

${notes ? `Customer Note: ${notes}\n` : ''}
Date: ${createdAt} BST
------------------------------------------------
`;

    // Send via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Defence Optics <onboarding@resend.dev>',
        to: [toEmail],
        subject: `🛒 New Order on Defence Optics — ${orderId}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend API Error:', resendData);
      return new Response(
        JSON.stringify({
          error: 'Resend API returned error',
          details: resendData,
        }),
        {
          status: resendRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Notification email sent for order ${orderId} via Resend. ID: ${resendData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        resend_id: resendData.id,
        recipient: toEmail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Unhandled Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
