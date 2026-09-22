import { initSupabase, getSupabaseCredentials } from './supabase';

export interface TestNotificationResult {
  success: boolean;
  message: string;
  details?: any;
}

export async function sendTestOrderEmail(): Promise<TestNotificationResult> {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return {
      success: false,
      message: 'Supabase credentials are not configured. Please save your Supabase URL & Anon Key in the Supabase tab first.',
    };
  }

  const sampleOrder = {
    id: `ORD-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    customer_name: 'Akash Pro (Test Order)',
    customer_phone: '01895600794',
    customer_address: 'Defence Officers Housing Society (DOHS), Mirpur-12, Dhaka',
    delivery_location: 'inside_dhaka',
    delivery_charge: 70,
    payment_method: 'bkash',
    transaction_id: '8N76BKASH99TEST',
    subtotal: 3200,
    total: 3270,
    notes: 'Test email alert verification from Defence Optics Admin panel.',
    items: [
      {
        product_name: 'Defence Classic Aviator Gold Frame',
        quantity: 1,
        unit_price: 3200,
      },
    ],
  };

  const client = initSupabase();

  try {
    // Attempt via Supabase Client Functions Invoke
    if (client && client.functions) {
      const { data, error } = await client.functions.invoke('notify-new-order', {
        body: sampleOrder,
      });

      if (!error && data?.success) {
        return {
          success: true,
          message: `Test email sent successfully via Edge Function! Resend ID: ${data.resend_id || 'OK'}. Please check your Gmail (akashprogofficial@gmail.com).`,
          details: data,
        };
      }

      if (error) {
        console.warn('client.functions.invoke error, trying direct HTTP fetch:', error);
      }
    }

    // Direct HTTP fetch fallback to Edge Function endpoint
    const cleanUrl = url.replace(/\/$/, '');
    const functionUrl = `${cleanUrl}/functions/v1/notify-new-order`;

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify(sampleOrder),
    });

    const resData = await res.json().catch(() => ({}));

    if (res.ok && resData?.success) {
      return {
        success: true,
        message: `Test email sent successfully via Edge Function! Resend ID: ${resData.resend_id || 'OK'}. Check your Gmail inbox (akashprogofficial@gmail.com).`,
        details: resData,
      };
    }

    if (res.status === 404) {
      return {
        success: false,
        message: 'Edge Function "notify-new-order" not found (404). Please create and deploy it in your Supabase Dashboard under Edge Functions.',
        details: resData,
      };
    }

    if (resData?.error?.includes('RESEND_API_KEY')) {
      return {
        success: false,
        message: 'RESEND_API_KEY secret is missing in Supabase Edge Functions! Add it in Supabase Dashboard -> Edge Functions -> Secrets.',
        details: resData,
      };
    }

    return {
      success: false,
      message: resData?.error || resData?.message || `Edge function returned HTTP status ${res.status}`,
      details: resData,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to invoke Edge Function: ${err?.message || 'Network error'}. Ensure function is deployed in Supabase.`,
      details: err,
    };
  }
}
