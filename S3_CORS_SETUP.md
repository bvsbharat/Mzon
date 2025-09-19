# S3 CORS Configuration Guide

## Issue
You're getting a CORS error when trying to access your S3 bucket from localhost:
```
Access to fetch at 'https://mascotly-ai.s3.us-east-1.amazonaws.com/mzon/gallery-metadata.json' from origin 'http://localhost:5173' has been blocked by CORS policy
```

## Solution
You need to configure CORS (Cross-Origin Resource Sharing) on your S3 bucket to allow browser requests from your development server.

## Option 1: Apply CORS Configuration via AWS Console
1. Go to AWS S3 Console: https://console.aws.amazon.com/s3/
2. Navigate to your bucket: `mascotly-ai`
3. Go to the **Permissions** tab
4. Scroll down to **Cross-origin resource sharing (CORS)**
5. Click **Edit**
6. Copy and paste the CORS configuration from `s3-cors-policy.json` (created in project root)

## Option 2: Apply CORS Configuration via AWS CLI
If you have AWS CLI permissions, run:

```bash
aws s3api put-bucket-cors --bucket mascotly-ai --cors-configuration file://s3-cors-policy.json
```

## Option 3: Request CORS Permission from Administrator
If you don't have S3 bucket permissions, request your AWS administrator to:
1. Apply the CORS configuration from `s3-cors-policy.json`
2. Ensure your IAM user has `s3:GetBucketCORS` and `s3:PutBucketCORS` permissions

## CORS Configuration Explained
The CORS policy allows:
- **Origins**: localhost:5173, localhost:5174 (development servers)
- **Methods**: GET, PUT, POST, DELETE, HEAD
- **Headers**: All headers (*)
- **Max Age**: 3000 seconds (caching for preflight requests)

## Current Fallback Behavior
While CORS is not configured, the application will:
1. ✅ Try to load from S3 (will fail with CORS error)
2. ✅ Gracefully fall back to localStorage
3. ✅ Continue functioning with local image storage
4. ⚠️ Show helpful console messages about CORS configuration

## After CORS Configuration
Once CORS is properly configured:
1. ✅ S3 image storage will work from browser
2. ✅ Gallery will sync with S3 bucket
3. ✅ Images will be stored in cloud instead of localStorage
4. ✅ Images will persist across devices and browser sessions

## Testing CORS Configuration
After applying CORS, you can test by:
1. Opening browser DevTools
2. Going to Console tab
3. Running: `fetch('https://mascotly-ai.s3.us-east-1.amazonaws.com/mzon/gallery-metadata.json')`
4. Should return response instead of CORS error

## Production Configuration
For production deployment, update the CORS policy to include your production domain instead of localhost.