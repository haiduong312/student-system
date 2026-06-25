import { api } from './api';

export async function openPrivateFile(fileUrl: string) {
  const response = await api.get<Blob>(toPrivateFileRequestUrl(fileUrl), {
    responseType: 'blob',
  });
  const blobUrl = URL.createObjectURL(response.data);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

function toPrivateFileRequestUrl(fileUrl: string) {
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  if (fileUrl.startsWith('/api/')) {
    const baseUrl = api.defaults.baseURL;
    if (!baseUrl) {
      return fileUrl;
    }

    return `${new URL(baseUrl).origin}${fileUrl}`;
  }

  return fileUrl;
}
