import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("<html><body><h2>Unauthorized</h2></body></html>", {
      status: 401,
      headers: { "Content-Type": "text/html" },
    })
  }

  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get("orderId")
  if (!orderId) {
    return new NextResponse("<html><body><h2>Missing order ID</h2></body></html>", {
      status: 400,
      headers: { "Content-Type": "text/html" },
    })
  }

  const payment = await prisma.payment.findUnique({ where: { orderId } })
  if (!payment || payment.userId !== Number(session.user.id)) {
    return new NextResponse("<html><body><h2>Order not found</h2></body></html>", {
      status: 404,
      headers: { "Content-Type": "text/html" },
    })
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || ""
  const userName = session.user.name || ""
  const userEmail = session.user.email || ""
  const planName = payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>MyMoney - Complete Payment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: white; border-radius: 20px; padding: 32px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #1F2937; }
    p { color: #6B7280; font-size: 14px; line-height: 1.5; margin-bottom: 8px; }
    .amount { font-size: 36px; font-weight: 800; margin: 16px 0; color: #1F2937; }
    .plan-badge { display: inline-block; background: #EEF2FF; color: #4F46E5; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
    .spinner { width: 40px; height: 40px; border: 4px solid #E5E7EB; border-top-color: #4F46E5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success-icon { width: 56px; height: 56px; background: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; color: white; }
    .error-icon { width: 56px; height: 56px; background: #EF4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; color: white; }
    .hidden { display: none; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 12px; border: none; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 16px; text-decoration: none; }
    .btn-primary { background: #4F46E5; color: white; }
    .btn-primary:hover { background: #4338CA; }
    .text-sm { font-size: 13px; color: #9CA3AF; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div id="loading">
      <div class="plan-badge">${planName}</div>
      <h1>Complete Payment</h1>
      <p>You're upgrading to the <strong>${planName}</strong> plan</p>
      <div class="amount">₹${(payment.amount / 100).toLocaleString("en-IN")}</div>
      <div class="spinner"></div>
      <p>Opening Razorpay checkout...</p>
    </div>

    <div id="success" class="hidden">
      <div class="success-icon">&#10003;</div>
      <h1>Payment Successful!</h1>
      <p>Your account has been upgraded to <strong>${planName}</strong>.</p>
      <p class="text-sm">You can close this window now.</p>
    </div>

    <div id="error" class="hidden">
      <div class="error-icon">&#10007;</div>
      <h1>Payment Failed</h1>
      <p id="errorMsg">Something went wrong. Please try again.</p>
      <button class="btn btn-primary" onclick="window.location.reload()">Try Again</button>
    </div>
  </div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    var options = {
      key: "${keyId}",
      amount: ${payment.amount},
      currency: "${payment.currency || 'INR'}",
      name: "MyMoney",
      description: "${planName} Plan",
      order_id: "${orderId}",
      handler: function (response) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('success').classList.remove('hidden');
        // Notify app via meta refresh redirect
        setTimeout(function() {
          window.location.href = 'mymoneyapp://payment/callback?order_id=' + response.razorpay_order_id + '&payment_id=' + response.razorpay_payment_id + '&signature=' + response.razorpay_signature;
        }, 2000);
      },
      modal: {
        ondismiss: function() {
          document.getElementById('loading').innerHTML = '<p style="margin-top:20px">Payment cancelled. <a href="javascript:window.location.reload()">Try again</a></p>';
        }
      },
      prefill: {
        email: "${userEmail}",
        name: "${userName}",
      },
      theme: { color: "#6366f1" },
    };

    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error').classList.remove('hidden');
      document.getElementById('errorMsg').textContent = response.error.description || 'Payment failed';
    });

    rzp.open();
  </script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
