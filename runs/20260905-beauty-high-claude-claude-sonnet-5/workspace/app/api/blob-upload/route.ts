import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

// Client-side direct-to-Blob upload handshake. Keeps the (multi-megabyte,
// full print-resolution) artwork PNG off our own serverless function's
// request body entirely — the browser uploads straight to Blob storage and
// we only ever see a small JSON handshake here.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png'],
        addRandomSuffix: true,
        maximumSizeInBytes: 25 * 1024 * 1024,
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('[blob] artwork uploaded', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 400 });
  }
}
