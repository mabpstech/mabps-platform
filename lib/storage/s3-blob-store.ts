import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { BlobStore } from "@/lib/storage/blob-store";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when MEDIA_STORAGE_DRIVER=s3.`);
  }
  return value;
}

/** Normalize DB storagePath to an S3 object key (strip leading data/uploads/). */
export function storagePathToObjectKey(storagePath: string): string {
  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const prefix = "data/uploads/";
  if (normalized.startsWith(prefix)) {
    return normalized.slice(prefix.length);
  }
  if (normalized.startsWith("data/uploads")) {
    return normalized.slice("data/uploads".length).replace(/^\/+/, "");
  }
  return normalized;
}

async function streamToBuffer(
  body: AsyncIterable<Uint8Array> | ReadableStream | Uint8Array | undefined,
): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (body instanceof Uint8Array) return Buffer.from(body);
  const chunks: Buffer[] = [];
  // Node.js Readable / SDK stream
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createS3BlobStore(): BlobStore {
  const bucket = requireEnv("S3_BUCKET");
  const region = process.env.S3_REGION?.trim() || "auto";
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const forcePathStyle =
    (process.env.S3_FORCE_PATH_STYLE || "true").toLowerCase() !== "false";

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });

  return {
    async put(key, body, meta) {
      const objectKey = storagePathToObjectKey(key);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: body,
          ContentType: meta.contentType,
        }),
      );
    },

    async get(key) {
      const objectKey = storagePathToObjectKey(key);
      try {
        const result = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
        return await streamToBuffer(
          result.Body as AsyncIterable<Uint8Array> | undefined,
        );
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          (error.name === "NoSuchKey" || error.name === "NotFound")
        ) {
          return null;
        }
        const status =
          error &&
          typeof error === "object" &&
          "$metadata" in error &&
          error.$metadata &&
          typeof error.$metadata === "object" &&
          "httpStatusCode" in error.$metadata
            ? Number(error.$metadata.httpStatusCode)
            : undefined;
        if (status === 404) return null;
        throw error;
      }
    },

    async delete(key) {
      const objectKey = storagePathToObjectKey(key);
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }),
      );
    },

    async deletePrefix(prefix) {
      const objectPrefix = storagePathToObjectKey(prefix).replace(/\/?$/, "/");
      let continuationToken: string | undefined;
      do {
        const listed = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: objectPrefix,
            ContinuationToken: continuationToken,
          }),
        );
        const keys = (listed.Contents || [])
          .map((item) => item.Key)
          .filter((key): key is string => Boolean(key));
        if (keys.length > 0) {
          await client.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: {
                Objects: keys.map((Key) => ({ Key })),
                Quiet: true,
              },
            }),
          );
        }
        continuationToken = listed.IsTruncated
          ? listed.NextContinuationToken
          : undefined;
      } while (continuationToken);
    },

    async exists(key) {
      const objectKey = storagePathToObjectKey(key);
      try {
        await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
        return true;
      } catch (error) {
        const status =
          error &&
          typeof error === "object" &&
          "$metadata" in error &&
          error.$metadata &&
          typeof error.$metadata === "object" &&
          "httpStatusCode" in error.$metadata
            ? Number(error.$metadata.httpStatusCode)
            : undefined;
        if (status === 404) return false;
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          (error.name === "NotFound" || error.name === "NoSuchKey")
        ) {
          return false;
        }
        throw error;
      }
    },
  };
}
