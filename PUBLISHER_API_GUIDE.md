# OptimEarn Publisher API Guide

Welcome to the OptimEarn Publisher API documentation. This guide provides comprehensive instructions for integrating OptimEarn offer tracking into your platform, including click tracking, postback webhooks, and signature verification.

---

## Overview

The OptimEarn Publisher API enables you to track user interactions with offers on your platform. The system provides:

- **Click Tracking**: Capture when users click on offers with unique click IDs
- **Completion Tracking**: Receive notifications when users complete offers
- **Postback Webhooks**: Get real-time callbacks with completion data and cryptographic signatures
- **Conversion Metrics**: Track conversion rates, ROI, and performance analytics

---

## Getting Started

### Authentication

All API requests require your **Publisher API Key** and **Webhook Secret**. These credentials are provided in your OptimEarn publisher dashboard under **Settings → API Keys**.

- **Publisher API Key**: Used to identify your account in tracking requests
- **Webhook Secret**: Used to sign and verify postback webhooks (HMAC-SHA256)

**Security Note**: Never share your Webhook Secret. Treat it like a password and rotate it regularly through your dashboard.

---

## Click Tracking

### Overview

Click tracking captures when users click on your offers. Each click generates a unique **Click ID** that is used to correlate with future completions.

### Integration Methods

#### Method 1: Click Pixel (Recommended for Simple Integration)

The simplest way to track clicks is using a tracking pixel. When a user clicks on an offer, redirect them through OptimEarn's tracking endpoint:

```html
<!-- Example: Redirect user through tracking pixel -->
<a href="https://optimearn.com/api/tracking/click?offer_id=123&publisher_id=YOUR_PUBLISHER_ID&redirect_url=https://example.com/offer">
  Click Here to Earn $50
</a>
```

**Parameters:**
- `offer_id` (required): The OptimEarn offer ID
- `publisher_id` (required): Your publisher account ID
- `redirect_url` (required): URL to redirect user to after tracking
- `user_id` (optional): Your internal user ID for correlation
- `custom_data` (optional): Additional tracking data (JSON-encoded)

**Response:**
The user is redirected to the `redirect_url` with a `click_id` parameter appended:

```
https://example.com/offer?click_id=click_abc123def456
```

Store the `click_id` on your platform for correlation with completion postbacks.

#### Method 2: API Request (For Advanced Integration)

For programmatic tracking, send an HTTP POST request to our click tracking endpoint:

```bash
curl -X POST https://optimearn.com/api/tracking/click \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PUBLISHER_API_KEY" \
  -d '{
    "offer_id": 123,
    "user_id": "user_456",
    "ip_address": "192.168.1.1",
    "country": "US",
    "device_type": "mobile",
    "custom_data": {
      "campaign_id": "summer_2024",
      "source": "email"
    }
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `offer_id` | integer | Yes | OptimEarn offer ID |
| `user_id` | string | Yes | Your internal user identifier |
| `ip_address` | string | No | User's IP address for geolocation |
| `country` | string | No | User's country code (ISO 3166-1 alpha-2) |
| `device_type` | string | No | Device type (desktop, mobile, tablet) |
| `custom_data` | object | No | Custom tracking metadata (max 1KB) |

**Response:**
```json
{
  "success": true,
  "click_id": "click_abc123def456",
  "timestamp": 1717636800,
  "offer_id": 123
}
```

Store the returned `click_id` for correlation with completion postbacks.

---

## Completion Tracking

### Overview

Completion tracking notifies OptimEarn when a user completes an offer on your platform. This triggers a postback webhook to your endpoint with completion details and a cryptographic signature.

### Recording a Completion

Send a POST request to record a completion:

```bash
curl -X POST https://optimearn.com/api/tracking/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PUBLISHER_API_KEY" \
  -d '{
    "click_id": "click_abc123def456",
    "user_id": "user_456",
    "status": "approved",
    "points_awarded": 100,
    "conversion_value": "2.50",
    "custom_data": {
      "survey_id": "survey_789",
      "completion_time": 300
    }
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `click_id` | string | Yes | Click ID from tracking pixel or API |
| `user_id` | string | Yes | Your internal user identifier |
| `status` | string | Yes | Completion status: `approved`, `pending`, `rejected` |
| `points_awarded` | integer | Yes | Points to award user (0-10000) |
| `conversion_value` | string | No | Monetary value of conversion (e.g., "2.50") |
| `custom_data` | object | No | Custom completion metadata (max 1KB) |

**Response:**
```json
{
  "success": true,
  "completion_id": "comp_xyz789abc123",
  "timestamp": 1717636900,
  "postback_sent": true
}
```

---

## Postback Webhooks

### Overview

When a completion is recorded, OptimEarn sends a postback webhook to your configured endpoint. The webhook includes completion data and a cryptographic signature for verification.

### Configuring Your Webhook Endpoint

1. Log in to your OptimEarn publisher dashboard
2. Go to **Settings → Webhook Configuration**
3. Enter your webhook endpoint URL (must be HTTPS)
4. Copy your **Webhook Secret** for signature verification
5. Test the webhook using the **Test Webhook** button

### Webhook Payload

OptimEarn sends a POST request to your webhook endpoint with the following payload:

```json
{
  "completion_id": "comp_xyz789abc123",
  "click_id": "click_abc123def456",
  "user_id": "user_456",
  "points": 100,
  "conversion_value": "2.50",
  "status": "approved",
  "timestamp": 1717636900,
  "custom_data": {
    "survey_id": "survey_789",
    "completion_time": 300
  }
}
```

### Webhook Headers

OptimEarn includes the following headers for signature verification:

| Header | Description |
|--------|-------------|
| `X-Webhook-Signature` | HMAC-SHA256 signature of the payload |
| `X-Webhook-Timestamp` | Unix timestamp when webhook was sent |
| `Content-Type` | Always `application/json` |

---

## Webhook Signature Verification

### Why Verify Signatures?

Signature verification ensures that:
1. The webhook came from OptimEarn (authentication)
2. The payload was not modified in transit (integrity)
3. The request is not a replay attack (timestamp validation)

### Verification Process

**Step 1: Extract Headers**
```javascript
const signature = req.headers['x-webhook-signature'];
const timestamp = req.headers['x-webhook-timestamp'];
```

**Step 2: Validate Timestamp**
Reject requests older than 5 minutes to prevent replay attacks:

```javascript
const currentTime = Math.floor(Date.now() / 1000);
const maxAge = 300; // 5 minutes

if (currentTime - parseInt(timestamp) > maxAge) {
  return res.status(401).json({ error: 'Request too old' });
}
```

**Step 3: Compute Expected Signature**
Create a canonical payload string and sign it with your Webhook Secret:

```javascript
const crypto = require('crypto');

// Create canonical payload (sorted parameters)
const payload = [
  `completion_id=${body.completion_id}`,
  `click_id=${body.click_id}`,
  `user_id=${body.user_id}`,
  `points=${body.points}`,
  ...(body.conversion_value ? [`conversion_value=${body.conversion_value}`] : []),
  `status=${body.status}`,
  `timestamp=${timestamp}`
].sort().join('&');

// Generate HMAC-SHA256 signature
const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');
```

**Step 4: Compare Signatures**
Use timing-safe comparison to prevent timing attacks:

```javascript
const signatureBuffer = Buffer.from(signature, 'hex');
const expectedBuffer = Buffer.from(expectedSignature, 'hex');

const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### Complete Verification Example (Node.js)

```javascript
const crypto = require('crypto');
const express = require('express');
const app = express();

const WEBHOOK_SECRET = 'your_webhook_secret_here';

app.post('/webhook', express.json(), (req, res) => {
  try {
    // Extract headers
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    if (!signature || !timestamp) {
      return res.status(400).json({ error: 'Missing headers' });
    }

    // Validate timestamp
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - parseInt(timestamp) > 300) {
      return res.status(401).json({ error: 'Request too old' });
    }

    // Build canonical payload
    const body = req.body;
    const payload = [
      `completion_id=${body.completion_id}`,
      `click_id=${body.click_id}`,
      `user_id=${body.user_id}`,
      `points=${body.points}`,
      ...(body.conversion_value ? [`conversion_value=${body.conversion_value}`] : []),
      `status=${body.status}`,
      `timestamp=${timestamp}`
    ].sort().join('&');

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    // Verify signature (timing-safe comparison)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook
    console.log('Webhook verified:', body);
    
    // Update user points, record completion, etc.
    // ...

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));
```

### Complete Verification Example (Python)

```python
import hmac
import hashlib
import json
from flask import Flask, request
from datetime import datetime, timedelta

app = Flask(__name__)
WEBHOOK_SECRET = 'your_webhook_secret_here'

@app.route('/webhook', methods=['POST'])
def webhook():
    try:
        # Extract headers
        signature = request.headers.get('X-Webhook-Signature')
        timestamp = request.headers.get('X-Webhook-Timestamp')

        if not signature or not timestamp:
            return {'error': 'Missing headers'}, 400

        # Validate timestamp
        current_time = int(datetime.now().timestamp())
        if current_time - int(timestamp) > 300:
            return {'error': 'Request too old'}, 401

        # Get request body
        body = request.get_json()

        # Build canonical payload (sorted parameters)
        params = [
            f"completion_id={body['completion_id']}",
            f"click_id={body['click_id']}",
            f"user_id={body['user_id']}",
            f"points={body['points']}",
            f"status={body['status']}",
            f"timestamp={timestamp}"
        ]
        
        if body.get('conversion_value'):
            params.insert(4, f"conversion_value={body['conversion_value']}")

        payload = '&'.join(sorted(params))

        # Compute expected signature
        expected_signature = hmac.new(
            WEBHOOK_SECRET.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

        # Verify signature (timing-safe comparison)
        if not hmac.compare_digest(signature, expected_signature):
            return {'error': 'Invalid signature'}, 401

        # Process webhook
        print(f'Webhook verified: {body}')
        
        # Update user points, record completion, etc.
        # ...

        return {'success': True, 'message': 'Webhook processed'}, 200

    except Exception as error:
        print(f'Webhook error: {error}')
        return {'error': 'Internal server error'}, 500

if __name__ == '__main__':
    app.run(port=3000)
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Webhook processed successfully |
| 400 | Bad Request | Missing or invalid parameters |
| 401 | Unauthorized | Invalid signature or expired timestamp |
| 429 | Rate Limited | Too many requests (retry after 60 seconds) |
| 500 | Server Error | OptimEarn server error (retry with exponential backoff) |

### Webhook Retry Logic

If your webhook endpoint returns a non-2xx status code, OptimEarn will retry with exponential backoff:

- **Attempt 1**: Immediate
- **Attempt 2**: 30 seconds later
- **Attempt 3**: 2 minutes later
- **Attempt 4**: 15 minutes later
- **Attempt 5**: 2 hours later

After 5 failed attempts, the webhook is marked as failed and logged in your dashboard.

### Example Error Response

```json
{
  "error": "Invalid signature",
  "code": "INVALID_SIGNATURE",
  "timestamp": 1717636900
}
```

---

## Best Practices

### 1. Always Verify Signatures

Never trust webhook data without verifying the signature. This is critical for security.

### 2. Use HTTPS for Webhooks

Your webhook endpoint must use HTTPS. HTTP endpoints will be rejected.

### 3. Respond Quickly

Return a 2xx status code within 10 seconds. Long-running operations should be queued for asynchronous processing.

### 4. Handle Idempotency

Webhooks may be retried. Use the `completion_id` to detect and skip duplicate processing:

```javascript
// Check if completion already processed
const existing = await db.completions.findOne({ completion_id });
if (existing) {
  return res.json({ success: true, message: 'Already processed' });
}

// Process new completion
// ...
```

### 5. Log All Webhooks

Log all webhook requests (with timestamp, signature, and status) for debugging and audit purposes.

### 6. Monitor Webhook Health

Track webhook success rates and failures. Set up alerts if failure rate exceeds 5%.

### 7. Rotate Webhook Secrets Regularly

Rotate your Webhook Secret every 90 days through your publisher dashboard.

---

## API Rate Limits

OptimEarn enforces the following rate limits:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/tracking/click` | 10,000 requests | Per minute |
| `/api/tracking/complete` | 5,000 requests | Per minute |
| Webhook delivery | 100 requests | Per second per endpoint |

If you exceed these limits, you'll receive a `429 Too Many Requests` response. Implement exponential backoff in your retry logic.

---

## Testing Your Integration

### Using the Webhook Simulator

OptimEarn provides a webhook simulator in your publisher dashboard:

1. Go to **Settings → Webhook Testing**
2. Click **Send Test Webhook**
3. Verify your endpoint receives the test payload
4. Check the response status and logs

### Manual Testing with cURL

Test your webhook endpoint locally:

```bash
# Generate a test signature
TIMESTAMP=$(date +%s)
PAYLOAD="click_id=test_123&completion_id=comp_456&points=100&status=approved&timestamp=$TIMESTAMP&user_id=user_789"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "your_webhook_secret" -hex | cut -d' ' -f2)

# Send test webhook
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -H "X-Webhook-Timestamp: $TIMESTAMP" \
  -d '{
    "completion_id": "comp_456",
    "click_id": "test_123",
    "user_id": "user_789",
    "points": 100,
    "status": "approved",
    "timestamp": '$TIMESTAMP'
  }'
```

---

## Support & Resources

- **Documentation**: https://docs.optimearn.com
- **API Status**: https://status.optimearn.com
- **Support Email**: support@optimearn.com
- **Developer Community**: https://community.optimearn.com

---

## Changelog

**Version 1.0** (June 2024)
- Initial release of Publisher API
- Click tracking and completion tracking
- Webhook signature verification (HMAC-SHA256)
- Postback retry logic with exponential backoff

---

*Last Updated: June 2024*
*API Version: 1.0*
