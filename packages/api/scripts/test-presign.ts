import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:9000",
  forcePathStyle: true,
  credentials: { accessKeyId: "minio", secretAccessKey: "minio12345" },
  requestChecksumCalculation: "WHEN_REQUIRED",
});

const Bucket = "perkify-evidence";
const Key = "evidence/test/hola.txt";
const body = "hola evidencia";

const putUrl = await getSignedUrl(
  s3,
  new PutObjectCommand({ Bucket, Key, ContentType: "text/plain", ContentLength: body.length }),
  { expiresIn: 60 },
);

const put = await fetch(putUrl, { method: "PUT", body, headers: { "Content-Type": "text/plain" } });
console.log("PUT:", put.status);

const getUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key }), { expiresIn: 60 });
const get = await fetch(getUrl);
console.log("GET:", get.status, await get.text());