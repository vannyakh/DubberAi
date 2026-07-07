import { API_URL, tokenStorage } from '../api';

export async function uploadFile(uri: string, name: string, mimeType: string) {
  const token = await tokenStorage.get();
  const form = new FormData();
  // React Native FormData accepts { uri, name, type } file descriptors
  form.append('file', { uri, name, type: mimeType } as unknown as Blob);
  const response = await fetch(`${API_URL}/api/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return (await response.json()) as { filename: string; url: string };
}
