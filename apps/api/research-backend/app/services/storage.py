"""
S3 Storage Service
"""

import boto3
from botocore.client import Config
from fastapi import UploadFile
from app.core.config import settings
from typing import Optional
import uuid


class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            config=Config(signature_version='s3v4'),
            region_name=settings.S3_REGION,
        )
        self.bucket = settings.S3_BUCKET
    
    async def upload_file(
        self,
        file: UploadFile,
        job_id: str,
        workspace_id: Optional[str] = None,
    ) -> str:
        """Upload file to S3 and return S3 path"""
        # Generate S3 key
        file_ext = "." + file.filename.split(".")[-1] if "." in file.filename else ""
        s3_key = f"{workspace_id or 'default'}/{job_id}{file_ext}"
        
        # Read file content
        content = await file.read()
        
        # Upload to S3
        self.s3_client.put_object(
            Bucket=self.bucket,
            Key=s3_key,
            Body=content,
            ContentType=file.content_type or "application/octet-stream",
        )
        
        return s3_key
    
    def get_presigned_url(self, s3_key: str, expires_in: int = 3600) -> str:
        """Generate presigned URL for reading file"""
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket, 'Key': s3_key},
            ExpiresIn=expires_in,
        )
    
    async def download_file(self, s3_key: str) -> bytes:
        """Download file from S3"""
        response = self.s3_client.get_object(Bucket=self.bucket, Key=s3_key)
        return response['Body'].read()

