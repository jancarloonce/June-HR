// src/utils/blobToBase64.ts

/**
 * Converts a Blob to a base64-encoded string.
 * @param blob - The Blob to convert.
 * @param callback - A callback function that receives the base64 string.
 */
export function blobToBase64(blob: Blob, callback: (base64: string) => void): void {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        // The result is a Data URL: "data:<mime-type>;base64,<data>"
        // We split on the comma to get the base64 part.
        const base64 = reader.result.split(',')[1];
        callback(base64);
      } else {
        callback("");
      }
    };
    reader.readAsDataURL(blob);
  }
  