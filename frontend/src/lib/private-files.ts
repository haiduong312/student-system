import { api } from './api';

export async function openPrivateFile(fileUrl: string) {
  const response = await getPrivateFileBlob(fileUrl);
  const blobUrl = URL.createObjectURL(response);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export async function getPrivateFileBlob(fileUrl: string) {
  const response = await api.get<Blob>(toPrivateFileRequestUrl(fileUrl), {
    responseType: 'blob',
  });
  return response.data;
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
