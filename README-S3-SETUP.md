# AWS S3 Setup Guide for Mzon Image Storage

This guide walks you through setting up an AWS S3 bucket for storing generated images in your Mzon application.

## Prerequisites

- AWS Account
- AWS CLI installed (optional but recommended)
- Basic understanding of AWS S3 and IAM

## Step 1: Create an S3 Bucket

### Option A: Using AWS Console

1. Log into your [AWS Console](https://console.aws.amazon.com/)
2. Navigate to S3 service
3. Click "Create bucket"
4. Configure the bucket:
   - **Bucket name**: `mzon-user-images` (or your preferred name)
   - **Region**: Choose a region close to your users (e.g., `us-east-1`)
   - **Object Ownership**: Keep default settings
   - **Block Public Access**: Uncheck "Block all public access" (we need public read access for image viewing)
   - **Bucket Versioning**: Enable if desired
   - **Encryption**: Enable default encryption
5. Click "Create bucket"

### Option B: Using AWS CLI

```bash
# Create the bucket
aws s3 mb s3://mzon-user-images --region us-east-1

# Configure public read access
aws s3api put-bucket-policy --bucket mzon-user-images --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mzon-user-images/*"
    }
  ]
}'
```

## Step 2: Create IAM User and Access Keys

### Using AWS Console

1. Navigate to IAM service
2. Click "Users" → "Add users"
3. Set username: `mzon-s3-user`
4. Select "Attach policies directly"
5. Create and attach a custom policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::mzon-user-images/*"
        }
    ]
}
```

6. Complete user creation
7. Go to the user's "Security credentials" tab
8. Click "Create access key" → "Application running outside AWS"
9. Save the Access Key ID and Secret Access Key

## Step 3: Configure Environment Variables

Update your `.env.local` file:

```env
# AWS S3 Configuration for Image Storage
VITE_AWS_REGION=us-east-1
VITE_AWS_ACCESS_KEY_ID=your_actual_access_key_here
VITE_AWS_SECRET_ACCESS_KEY=your_actual_secret_key_here
VITE_AWS_S3_BUCKET=mzon-user-images
```

## Step 4: Deploy Environment Variables to Vercel

If deploying to Vercel, add these environment variables:

```bash
# Add AWS configuration to Vercel
echo "us-east-1" | vercel env add VITE_AWS_REGION production
echo "your_access_key" | vercel env add VITE_AWS_ACCESS_KEY_ID production
echo "your_secret_key" | vercel env add VITE_AWS_SECRET_ACCESS_KEY production
echo "mzon-user-images" | vercel env add VITE_AWS_S3_BUCKET production
```

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Generate an image in any studio
3. Check your browser's console for storage messages
4. Verify images appear in your S3 bucket

## Folder Structure

The app will organize images in S3 as follows:

```
mzon-user-images/
├── users/
│   └── [user-id]/
│       ├── generated/
│       │   └── 2024/01/
│       ├── uploaded/
│       ├── variation/
│       ├── composed/
│       └── edited/
└── general/
    └── 2024/01/
```

## Security Best Practices

### For Production:

1. **Use IAM Roles**: Instead of access keys, use IAM roles when deploying to AWS services
2. **Restrict CORS**: Configure CORS policy on your bucket
3. **Enable CloudFront**: Use CloudFront CDN for better performance
4. **Set up Lifecycle Policies**: Automatically delete old images or move to cheaper storage

### Example CORS Configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["https://your-domain.com"],
        "ExposeHeaders": []
    }
]
```

## Troubleshooting

### Common Issues:

1. **403 Forbidden**: Check IAM permissions and bucket policy
2. **CORS Errors**: Configure CORS settings on your bucket
3. **Images not loading**: Verify public read access is enabled
4. **Upload failures**: Check access key permissions and network connectivity

### Fallback Behavior:

If S3 is not configured or fails, the app will automatically fall back to storing images as data URLs in browser memory. Users will see a notification indicating the storage method used.

## Cost Considerations

- **Storage**: ~$0.023 per GB per month
- **Requests**: PUT/COPY/POST ~$0.005 per 1,000 requests
- **Data Transfer**: First 1 GB free, then ~$0.09 per GB

For a typical user generating 100 images per month (average 500KB each), expect costs under $1/month.

## Monitoring

Set up CloudWatch alarms for:
- Bucket size
- Request counts
- Error rates
- Data transfer costs