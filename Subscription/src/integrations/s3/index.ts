import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../../config/env';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';

let client: S3Client | null = null;

type S3Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

type S3Options = {
  bucket?: string;
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  publicBaseUrl?: string;
  credentials?: S3Credentials;
};

function getClient(options?: S3Options) {
  if (!options && client) {
    return client;
  }

  const credentials =
    options?.credentials ??
    (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          sessionToken: env.AWS_SESSION_TOKEN || undefined,
        }
      : undefined);

  const nextClient = new S3Client({
    region: options?.region ?? env.S3_REGION,
    endpoint: (options?.endpoint ?? env.S3_ENDPOINT) || undefined,
    forcePathStyle: options?.forcePathStyle ?? env.S3_FORCE_PATH_STYLE === 'true',
    credentials,
  });

  if (!options) {
    client = nextClient;
  }

  return nextClient;
}

export async function uploadObject(input: { key: string; body: Buffer | string; contentType?: string }, options?: S3Options) {
  const bucket = options?.bucket ?? env.S3_BUCKET;
  if (!bucket) {
    return { key: input.key, url: `s3://${input.key}` };
  }

  try {
    await getClient(options).send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  } catch (error) {
    throw new AppError(
      'Failed to upload object to S3',
      502,
      ErrorCodes.InternalServerError,
      error instanceof Error ? error.message : 'upload_failed',
    );
  }

  return {
    key: input.key,
    url: options?.publicBaseUrl
      ? `${options.publicBaseUrl.replace(/\/$/, '')}/${input.key}`
      : env.S3_PUBLIC_BASE_URL
        ? `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${input.key}`
        : `s3://${bucket}/${input.key}`,
  };
}
