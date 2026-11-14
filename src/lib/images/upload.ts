// Runs in the browser: uploads a file to a Supabase signed upload URL.
// Uses XMLHttpRequest rather than fetch because only it reports upload
// progress, which matters on a slow phone connection.

import { supabaseKey } from "@/lib/supabase/env";

export function uploadToSignedUrl(
  signedUrl: string,
  body: Blob,
  onProgress: (loadedBytes: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.setRequestHeader("content-type", body.type || "image/jpeg");
    request.setRequestHeader("x-upsert", "false");
    request.setRequestHeader("apikey", supabaseKey());
    request.upload.onprogress = (event) => onProgress(event.loaded);
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(body.size);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${request.status}`));
      }
    };
    request.onerror = () => reject(new Error("Upload failed: network error"));
    request.send(body);
  });
}
