"""
S3 Proxy Routes for handling S3 operations server-to-server
Bypasses browser CORS restrictions by proxying requests through backend
"""
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import Optional
import json

from services.s3_proxy_service import s3_proxy_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/s3", tags=["s3-proxy"])

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    key: Optional[str] = Form(None),
    content_type: Optional[str] = Form(None)
):
    """Upload file to S3 via backend proxy"""
    try:
        logger.info(f"📤 S3 proxy upload request: {file.filename}")
        
        # Read file content
        file_content = await file.read()
        
        # Use provided key or generate from filename
        s3_key = key or file.filename
        file_content_type = content_type or file.content_type or 'application/octet-stream'
        
        # Upload via S3 proxy service
        result = await s3_proxy_service.upload_file(
            file_content=file_content,
            key=s3_key,
            content_type=file_content_type
        )
        
        logger.info(f"✅ S3 proxy upload successful: {s3_key}")
        return {
            "success": True,
            "key": s3_key,
            "url": result.get("url"),
            "message": "File uploaded successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ S3 proxy upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/download/{key:path}")
async def download_file(key: str):
    """Download file from S3 via backend proxy"""
    try:
        logger.info(f"📥 S3 proxy download request: {key}")
        
        file_content, content_type = await s3_proxy_service.download_file(key)
        
        def generate():
            yield file_content
        
        return StreamingResponse(
            generate(),
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={key.split('/')[-1]}"}
        )
        
    except Exception as e:
        logger.error(f"❌ S3 proxy download error: {str(e)}")
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")

@router.delete("/delete")
async def delete_file(key: str):
    """Delete file from S3 via backend proxy"""
    try:
        logger.info(f"🗑️ S3 proxy delete request: {key}")
        
        await s3_proxy_service.delete_file(key)
        
        logger.info(f"✅ S3 proxy delete successful: {key}")
        return {
            "success": True,
            "key": key,
            "message": "File deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ S3 proxy delete error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@router.get("/list")
async def list_files(prefix: Optional[str] = None, limit: int = 100):
    """List files in S3 bucket via backend proxy"""
    try:
        logger.info(f"📋 S3 proxy list request: prefix={prefix}, limit={limit}")
        
        files = await s3_proxy_service.list_files(prefix=prefix, limit=limit)
        
        return {
            "success": True,
            "files": files,
            "count": len(files)
        }
        
    except Exception as e:
        logger.error(f"❌ S3 proxy list error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"List failed: {str(e)}")

@router.get("/health")
async def health_check():
    """Check S3 proxy service health"""
    try:
        is_healthy = await s3_proxy_service.health_check()
        
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "service": "s3-proxy",
            "aws_configured": s3_proxy_service.is_configured()
        }
        
    except Exception as e:
        logger.error(f"❌ S3 proxy health check error: {str(e)}")
        return {
            "status": "unhealthy",
            "service": "s3-proxy",
            "error": str(e),
            "aws_configured": False
        }
