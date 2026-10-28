#!/bin/sh
awslocal s3api create-bucket --bucket "${R2_BUCKET_NAME:-wasanni-local}" --region "${AWS_DEFAULT_REGION:-us-east-1}" 2>/dev/null || true
