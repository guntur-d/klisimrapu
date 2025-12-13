// GCS Upload handling
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucketName = process.env.GCS_BUCKET_NAME;

export const uploadFileToGCS = async (fileBuffer, fileName, mimeType) => {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  const blobStream = file.createWriteStream({
    metadata: {
      contentType: mimeType,
    },
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', reject);

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
      resolve(publicUrl);
    });

    blobStream.end(fileBuffer);
  });
};