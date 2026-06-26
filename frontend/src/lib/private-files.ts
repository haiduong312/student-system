import { api } from './api';

export interface PrivateFileBlob {
  blob: Blob;
  objectUrl: string;
  fileName: string;
  contentType: string;
  revoke: () => void;
}

export async function openPrivateFile(fileUrl: string) {
  const file = await getPrivateFileObjectUrl(fileUrl);
  if (canPreview(file.contentType, file.fileName)) {
    window.open(file.objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(file.revoke, 60_000);
    return;
  }

  downloadBlobUrl(file);
}

export async function getPrivateFileBlob(fileUrl: string) {
  const response = await api.get<Blob>(toPrivateFileRequestUrl(fileUrl), {
    responseType: 'blob',
  });
  return response.data;
}

export async function getPrivateFileObjectUrl(fileUrl: string): Promise<PrivateFileBlob> {
  const response = await api.get<Blob>(toPrivateFileRequestUrl(fileUrl), {
    responseType: 'blob',
  });
  const blob = response.data;
  const objectUrl = URL.createObjectURL(blob);
  const contentType =
    getHeaderValue(response.headers['content-type']) ||
    blob.type ||
    'application/octet-stream';
  const fileName =
    getFileNameFromDisposition(getHeaderValue(response.headers['content-disposition'])) ??
    getSafeFileNameFromUrl(fileUrl) ??
    'download';

  return {
    blob,
    objectUrl,
    fileName,
    contentType,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

export async function downloadPrivateFile(fileUrl: string, fileName?: string | null) {
  const file = await getPrivateFileObjectUrl(fileUrl);
  downloadBlobUrl({ ...file, fileName: fileName || file.fileName });
}

function downloadBlobUrl(file: PrivateFileBlob) {
  const link = document.createElement('a');
  link.href = file.objectUrl;
  link.download = file.fileName;
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(file.revoke, 0);
}

function canPreview(contentType: string, fileName: string) {
  return (
    contentType.startsWith('image/') ||
    contentType === 'application/pdf' ||
    /\.pdf$/i.test(fileName)
  );
}

function toPrivateFileRequestUrl(fileUrl: string) {
  const privateUrl = toPrivateUploadUrl(fileUrl);
  if (privateUrl.startsWith('/api/')) {
    const baseUrl = api.defaults.baseURL;
    if (!baseUrl) {
      return privateUrl;
    }

    return `${new URL(baseUrl).origin}${privateUrl}`;
  }

  if (/^https?:\/\//i.test(privateUrl)) {
    return privateUrl;
  }

  return privateUrl;
}

function toPrivateUploadUrl(fileUrl: string) {
  const match = fileUrl.match(/\/uploads\/profiles\/([^/?#]+)/);
  if (match?.[1]) {
    return `/api/uploads/profiles/${match[1]}`;
  }

  return fileUrl;
}

function getFileNameFromDisposition(disposition?: string) {
  if (!disposition) {
    return null;
  }

  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    return sanitizeFileName(decodeURIComponent(encodedMatch[1]));
  }

  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ? sanitizeFileName(match[1]) : null;
}

function getHeaderValue(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === 'string');
  }

  return undefined;
}

function getSafeFileNameFromUrl(fileUrl: string) {
  const pathname = /^https?:\/\//i.test(fileUrl)
    ? new URL(fileUrl).pathname
    : fileUrl.split('?')[0];
  const fileName = pathname.split('/').pop();
  return fileName ? sanitizeFileName(fileName) : null;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\- ]+/g, '_');
}
