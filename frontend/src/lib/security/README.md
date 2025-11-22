# Security Implementation

This directory contains security utilities for the Internly application.

## Features

### 1. Content Filtering (`content-filter.ts`)

Filters inappropriate content including:
- **Profanity**: Blocks common profane words
- **Spam Patterns**: Detects repeated characters, excessive caps, etc.
- **Reserved Names**: Prevents use of reserved system names (admin, test, etc.)
- **Input Sanitization**: Removes dangerous characters and normalizes text

**Usage:**
```typescript
import { validateCompanyName, validateRoleName, validateReviewContent } from "@/lib/security/content-filter";

// Validate company name
const result = validateCompanyName("My Company");
if (!result.isValid) {
  console.error(result.reason);
}

// Validate review content
const contentResult = validateReviewContent("This is my review...", "Summary");
```

**Customization:**
- Add more words to `PROFANITY_LIST` in `content-filter.ts`
- Adjust spam patterns in `SPAM_PATTERNS`
- Add reserved names to `RESERVED_COMPANY_NAMES`

### 2. Rate Limiting (`rate-limit.ts`)

Prevents abuse by limiting API requests per user/IP.

**Current Limits:**
- Company creation: 5 per hour
- Review creation: 10 per hour
- Role creation: 10 per hour
- General API: 100 per minute

**Usage:**
```typescript
import { checkRateLimit, getClientIdentifier, getIpAddress, RATE_LIMITS } from "@/lib/security/rate-limit";

const ipAddress = getIpAddress(request);
const identifier = getClientIdentifier(userId, ipAddress);
const rateLimit = checkRateLimit(identifier, RATE_LIMITS.CREATE_COMPANY);

if (!rateLimit.allowed) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429 }
  );
}
```

**Note:** Current implementation uses in-memory storage. For production with multiple servers, consider using Redis.

### 3. Validation Integration

All validation schemas in `@/lib/validations/schemas.ts` automatically:
- Sanitize input text
- Check for profanity
- Validate content appropriateness
- Return user-friendly error messages

## Adding More Security

### Expand Profanity List

Edit `frontend/src/lib/security/content-filter.ts`:

```typescript
const PROFANITY_LIST = [
  // Add your words here
  "word1", "word2", ...
];
```

### Use External Libraries

For more comprehensive filtering, consider:
- `bad-words` npm package
- `profanity-filter` npm package
- External API services (e.g., Perspective API by Google)

### Production Rate Limiting

For production, replace in-memory rate limiting with Redis:

```typescript
import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL);

// Store rate limit data in Redis instead of memory
```

## Security Best Practices

1. **Always validate on the server** - Client-side validation can be bypassed
2. **Sanitize all user input** - Never trust user input
3. **Use rate limiting** - Prevent abuse and DoS attacks
4. **Log security events** - Monitor for suspicious activity
5. **Keep dependencies updated** - Regularly update npm packages
6. **Use HTTPS** - Always use HTTPS in production
7. **Implement CORS properly** - Restrict allowed origins
8. **Use environment variables** - Never commit secrets

## Testing Security

Test your security measures:

```typescript
// Test profanity filter
validateCompanyName("badword company"); // Should fail

// Test rate limiting
// Make multiple rapid requests - should get 429 after limit

// Test input sanitization
sanitizeText("test\x00null"); // Should remove null bytes
```

