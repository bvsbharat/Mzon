"""
S3 Proxy Service for handling S3 operations server-to-server
Bypasses browser CORS restrictions by proxying requests through backend
"""
import os
import logging
from typing import Optional, Tuple, List, Dict, Any
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class S3ProxyService:
    """S3 Proxy Service for server-to-server S3 operations"""
    
    def __init__(self):
        self.bucket_name = "mascotly-ai"  # Fixed bucket name from memory
        self.s3_client = None
        self.executor = ThreadPoolExecutor(max_workers=4)
        self._initialize_s3_client()
    
    def _initialize_s3_client(self):
        """Initialize S3 client with AWS credentials"""
        try:
            # Check for AWS credentials in environment
            aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
            aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
            aws_region = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
            
            if aws_access_key and aws_secret_key:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=aws_access_key,
                    aws_secret_access_key=aws_secret_key,
                    region_name=aws_region
                )
                logger.info("✅ S3 client initialized with environment credentials")
            else:
                # Try to use default AWS credentials (IAM role, ~/.aws/credentials, etc.)
                self.s3_client = boto3.client('s3', region_name=aws_region)
                logger.info("✅ S3 client initialized with default credentials")
                
        except NoCredentialsError:
            logger.warning("⚠️ AWS credentials not found. S3 operations will fail.")
            self.s3_client = None
        except Exception as e:
            logger.error(f"❌ Failed to initialize S3 client: {str(e)}")
            self.s3_client = None
    
    def is_configured(self) -> bool:
        """Check if S3 client is properly configured"""
        return self.s3_client is not None
    
    async def health_check(self) -> bool:
        """Check if S3 service is accessible"""
        if not self.is_configured():
            return False
        
        try:
            # Try to list objects in bucket (limit to 1 to minimize cost)
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                lambda: self.s3_client.list_objects_v2(
                    Bucket=self.bucket_name,
                    MaxKeys=1
                )
            )
            return True
        except Exception as e:
            logger.error(f"❌ S3 health check failed: {str(e)}")
            return False
    
    async def upload_file(
        self,
        file_content: bytes,
        key: str,
        content_type: str = 'application/octet-stream'
    ) -> Dict[str, Any]:
        """Upload file to S3 bucket"""
        if not self.is_configured():
            raise ValueError("S3 client not configured. Please set AWS credentials.")
        
        try:
            # Upload file to S3
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                lambda: self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=file_content,
                    ContentType=content_type
                )
            )
            
            # Generate URL for the uploaded file
            url = f"https://{self.bucket_name}.s3.amazonaws.com/{key}"
            
            logger.info(f"✅ File uploaded to S3: {key}")
            return {
                "key": key,
                "url": url,
                "bucket": self.bucket_name,
                "content_type": content_type,
                "size": len(file_content)
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"❌ S3 upload error ({error_code}): {str(e)}")
            raise Exception(f"S3 upload failed: {error_code}")
        except Exception as e:
            logger.error(f"❌ Unexpected upload error: {str(e)}")
            raise Exception(f"Upload failed: {str(e)}")
    
    async def download_file(self, key: str) -> Tuple[bytes, str]:
        """Download file from S3 bucket"""
        if not self.is_configured():
            raise ValueError("S3 client not configured. Please set AWS credentials.")
        
        try:
            # Download file from S3
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self.executor,
                lambda: self.s3_client.get_object(
                    Bucket=self.bucket_name,
                    Key=key
                )
            )
            
            file_content = response['Body'].read()
            content_type = response.get('ContentType', 'application/octet-stream')
            
            logger.info(f"✅ File downloaded from S3: {key}")
            return file_content, content_type
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                raise Exception(f"File not found: {key}")
            logger.error(f"❌ S3 download error ({error_code}): {str(e)}")
            raise Exception(f"S3 download failed: {error_code}")
        except Exception as e:
            logger.error(f"❌ Unexpected download error: {str(e)}")
            raise Exception(f"Download failed: {str(e)}")
    
    async def delete_file(self, key: str) -> bool:
        """Delete file from S3 bucket"""
        if not self.is_configured():
            raise ValueError("S3 client not configured. Please set AWS credentials.")
        
        try:
            # Delete file from S3
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                lambda: self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=key
                )
            )
            
            logger.info(f"✅ File deleted from S3: {key}")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"❌ S3 delete error ({error_code}): {str(e)}")
            raise Exception(f"S3 delete failed: {error_code}")
        except Exception as e:
            logger.error(f"❌ Unexpected delete error: {str(e)}")
            raise Exception(f"Delete failed: {str(e)}")
    
    async def list_files(
        self,
        prefix: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List files in S3 bucket"""
        if not self.is_configured():
            raise ValueError("S3 client not configured. Please set AWS credentials.")
        
        try:
            # List objects in S3 bucket
            loop = asyncio.get_event_loop()
            kwargs = {
                'Bucket': self.bucket_name,
                'MaxKeys': limit
            }
            if prefix:
                kwargs['Prefix'] = prefix
            
            response = await loop.run_in_executor(
                self.executor,
                lambda: self.s3_client.list_objects_v2(**kwargs)
            )
            
            files = []
            for obj in response.get('Contents', []):
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'url': f"https://{self.bucket_name}.s3.amazonaws.com/{obj['Key']}"
                })
            
            logger.info(f"✅ Listed {len(files)} files from S3")
            return files
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"❌ S3 list error ({error_code}): {str(e)}")
            raise Exception(f"S3 list failed: {error_code}")
        except Exception as e:
            logger.error(f"❌ Unexpected list error: {str(e)}")
            raise Exception(f"List failed: {str(e)}")

# Global instance
s3_proxy_service = S3ProxyService()
