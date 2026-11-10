import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ENV } from "../env";

const s3 = new S3Client({
  region: ENV.S3_REGION,
  endpoint: ENV.S3_ENDPOINT || undefined,
  forcePathStyle: ENV.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: ENV.S3_ACCESS_KEY_ID,
    secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
});

const Bucket = ENV.S3_BUCKET;

export const presignUpload = (key: string, contentType: string, size: number) =>
  getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket, Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: 300 },
  );

export const presignRead = (key: string) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: 300 });

export async function objectSize(key: string): Promise<number | null> {
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    return r.ContentLength ?? null;
  } catch {
    return null;
  }
}