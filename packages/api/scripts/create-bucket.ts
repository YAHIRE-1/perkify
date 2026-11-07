import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:9000",
  forcePathStyle: true,
  credentials: { accessKeyId: "minio", secretAccessKey: "minio12345" },
});

const Bucket = "perkify-evidence";

try {
  await s3.send(new HeadBucketCommand({ Bucket }));
  console.log(`El bucket ${Bucket} ya existe`);
} catch {
  await s3.send(new CreateBucketCommand({ Bucket }));
  console.log(`Bucket ${Bucket} creado`);
}
