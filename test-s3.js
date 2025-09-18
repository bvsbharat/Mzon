// Test script to verify S3 configuration
import { s3Service } from './services/s3Service.js';

async function testS3() {
  console.log('Testing S3 service...');

  if (!s3Service) {
    console.error('❌ S3 service is not initialized');
    return;
  }

  console.log('✅ S3 service is initialized');

  // Create a simple test image data URL (1x1 red pixel)
  const testImageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  try {
    console.log('Uploading test image...');
    const result = await s3Service.uploadImage(testImageDataUrl, 'test', 'test-image.png');
    console.log('✅ Upload successful:', result);

    // Clean up test image
    console.log('Cleaning up test image...');
    await s3Service.deleteImage(result);
    console.log('✅ Cleanup successful');

  } catch (error) {
    console.error('❌ S3 test failed:', error.message);
  }
}

testS3();