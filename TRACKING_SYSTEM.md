# OptimEarn Offer Tracking System

## Overview

The offer tracking system allows you to monitor clicks, completions, and conversions for each offer on your platform. It includes click ID generation, postback delivery with retry logic, and comprehensive analytics.

## Database Schema

### 1. `offer_tracking_config` - Tracking Configuration
Stores tracking settings for each offer:
- `taskId` - Unique offer identifier
- `postbackUrl` - Webhook URL to receive completion notifications
- `clickIdFormat` - Format for click IDs: `uuid`, `uuid_prefix`, or `sequential`
- `trackingEnabled` - Enable/disable tracking for this offer

### 2. `offer_clicks` - Click Tracking
Records every click on an offer:
- `taskId` - Offer identifier
- `userId` - User ID (nullable for anonymous clicks)
- `clickId` - Unique click identifier (primary tracking key)
- `ipAddress` - User's IP address
- `userAgent` - Browser user agent
- `country` - User's country code
- `referrer` - HTTP referrer
- `clickedAt` - Timestamp of click

### 3. `offer_completions` - Completion Tracking
Records when users complete offers:
- `taskId` - Offer identifier
- `userId` - User ID
- `clickId` - Link to original click
- `completionId` - Unique completion identifier
- `status` - `pending`, `approved`, `rejected`, or `duplicate`
- `pointsAwarded` - Points given to user
- `conversionValue` - Monetary value of conversion
- `metadata` - JSON data from completion

### 4. `offer_postbacks` - Postback Delivery
Tracks postback delivery attempts:
- `completionId` - Link to offer completion
- `postbackUrl` - URL that received the postback
- `status` - `pending`, `sent`, `failed`, or `success`
- `httpStatus` - HTTP response code
- `responseBody` - Response from postback endpoint
- `attemptCount` - Number of delivery attempts
- `maxAttempts` - Maximum retry attempts (default: 5)
- `nextRetryAt` - Scheduled time for next retry
- `lastAttemptAt` - Timestamp of last attempt
- `sentAt` - Timestamp when successfully sent

## Database Helper Functions

### Recording Clicks
```typescript
// Record a new click
const clickId = await recordOfferClick({
  taskId: 123,
  userId: 456,
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  country: "US",
  referrer: "https://example.com"
});

// Get clicks for an offer
const clicks = await getOfferClicks(taskId, limit, offset);
```

### Recording Completions
```typescript
// Record a completion
const completionId = await recordOfferCompletion({
  taskId: 123,
  userId: 456,
  clickId: "123-uuid-here",
  completionId: "comp-uuid-here",
  status: "pending",
  pointsAwarded: 100,
  conversionValue: 2.50,
  metadata: { source: "mobile", device: "iPhone" }
});

// Get completions for an offer
const completions = await getOfferCompletions(taskId, limit, offset);

// Update completion status
await updateOfferCompletionStatus(completionId, "approved");
```

### Tracking Configuration
```typescript
// Create or update tracking config
await createOrUpdateTrackingConfig(taskId, {
  postbackUrl: "https://publisher.com/postback",
  clickIdFormat: "uuid",
  trackingEnabled: true
});

// Get tracking config
const config = await getTrackingConfig(taskId);
```

### Analytics
```typescript
// Get tracking stats (clicks, completions, conversions, conversion rate)
const stats = await getTrackingStats(taskId);
// Returns: { clicks: 1000, completions: 150, conversions: 120, conversionRate: 12 }

// Get postback delivery stats
const postbackStats = await getPostbackStats(taskId);
// Returns: { total: 150, sent: 145, failed: 5, success: 140, pending: 0 }
```

## Admin tRPC Procedures

### Configure Tracking
```typescript
// Admin only: Configure tracking for an offer
await trpc.tracking.configureTracking.mutate({
  taskId: 123,
  postbackUrl: "https://publisher.com/postback",
  clickIdFormat: "uuid",
  trackingEnabled: true
});
```

### Get Tracking Configuration
```typescript
const config = await trpc.tracking.getConfig.query({ taskId: 123 });
```

### Get Click Statistics
```typescript
const { clicks, stats } = await trpc.tracking.getClickStats.query({
  taskId: 123,
  limit: 100,
  offset: 0
});
```

### Get Completion Statistics
```typescript
const { completions, stats } = await trpc.tracking.getCompletionStats.query({
  taskId: 123,
  limit: 100,
  offset: 0
});
```

### Get Postback Statistics
```typescript
const postbackStats = await trpc.tracking.getPostbackStats.query({ taskId: 123 });
```

### Update Completion Status
```typescript
await trpc.tracking.updateCompletionStatus.mutate({
  completionId: 456,
  status: "approved"
});
```

## Postback System

### Postback Format
When a completion is approved, a postback is sent to the configured URL with the following parameters:

```
POST https://publisher.com/postback?
  click_id={clickId}&
  completion_id={completionId}&
  user_id={userId}&
  points={pointsAwarded}&
  conversion_value={conversionValue}&
  status=approved&
  timestamp={timestamp}
```

### Retry Logic
- Initial attempt: Immediately after completion approval
- Retry attempts: Up to 5 total (configurable)
- Backoff strategy: Exponential backoff with jitter
- Retry schedule: 1m, 5m, 15m, 1h, 4h

### Postback Validation
The system validates:
- URL is properly formatted
- Endpoint responds with 2xx status
- Response body is valid (optional JSON validation)

## Integration Points

### 1. Wire Click Tracking into Task Start
When a user clicks "Start" on an offer, record a click:
```typescript
const clickId = await recordOfferClick({
  taskId: task.id,
  userId: user.id,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  country: user.country
});
```

### 2. Wire Completion Tracking into Task Completion
When a user completes a task, record the completion:
```typescript
const completionId = await recordOfferCompletion({
  taskId: task.id,
  userId: user.id,
  clickId: storedClickId,
  status: "pending",
  pointsAwarded: task.points,
  conversionValue: calculateConversionValue(task)
});

// Trigger postback delivery
await sendPostback(completionId);
```

### 3. Public API Endpoints
Create public endpoints for external tracking:
```typescript
// POST /api/tracking/click
// POST /api/tracking/complete
```

## Analytics Dashboard

### Key Metrics
- **Total Clicks**: Number of users who clicked the offer
- **Total Completions**: Number of users who completed the offer
- **Approved Conversions**: Number of approved completions
- **Conversion Rate**: (Approved / Clicks) × 100
- **Click-to-Completion Rate**: (Completions / Clicks) × 100
- **Postback Success Rate**: (Successful Postbacks / Total Postbacks) × 100

### Filtering
- Date range (last 7 days, 30 days, custom)
- Status (all, pending, approved, rejected, duplicate)
- Offer (single or multiple)

### Export
- CSV export of clicks, completions, and postbacks
- Customizable columns
- Date range selection

## Security Considerations

1. **Click ID Uniqueness**: Each click gets a unique ID to prevent duplicate submissions
2. **Postback Validation**: Validate postback URLs and responses
3. **Rate Limiting**: Implement rate limiting on public tracking endpoints
4. **Authentication**: Postback endpoints should validate request signatures
5. **Data Privacy**: Store minimal PII, comply with GDPR/CCPA

## Troubleshooting

### Postbacks Not Sending
1. Check `offer_tracking_config.postbackUrl` is valid
2. Verify postback endpoint is accessible
3. Check `offer_postbacks` table for failed attempts
4. Review HTTP status codes in `offer_postbacks.httpStatus`

### High Duplicate Rate
1. Implement client-side deduplication
2. Check for bot traffic
3. Review fraud detection rules
4. Validate completion proofs

### Missing Click Data
1. Ensure click tracking is wired into task start flow
2. Check `offer_tracking_config.trackingEnabled` is true
3. Verify user IP and user agent are being captured

## Next Steps

1. **Create Public API Endpoints** - Build `/api/tracking/click` and `/api/tracking/complete`
2. **Build Tracking Dashboard** - Create admin UI for analytics and reports
3. **Implement Postback Retry** - Add background job for postback delivery
4. **Add Webhook Validation** - Implement signature verification
5. **Create CSV Export** - Add data export functionality
6. **Write Tests** - Add comprehensive test coverage (15+ tests)
