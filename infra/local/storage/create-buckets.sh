#!/bin/sh
# Idempotent: creates the private and public buckets named in .env.example (docs/05 upload flow).
set -eu
for bucket in catbuzz-private catbuzz-public; do
  if echo "s3.bucket.list" | weed shell -master=storage:9333 | grep -qw "$bucket"; then
    echo "bucket $bucket exists"
  else
    echo "s3.bucket.create -name $bucket" | weed shell -master=storage:9333
    echo "bucket $bucket created"
  fi
done
