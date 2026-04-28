import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const isNative = () => Capacitor.isNativePlatform();

export async function takeNativePhoto(
  source: 'camera' | 'gallery' | 'prompt' = 'prompt'
): Promise<{ dataUrl: string; format: string } | null> {
  const sourceMap = {
    camera: CameraSource.Camera,
    gallery: CameraSource.Photos,
    prompt: CameraSource.Prompt,
  };

  const photo = await Camera.getPhoto({
    resultType: CameraResultType.DataUrl,
    source: sourceMap[source],
    quality: 90,
  });

  if (!photo.dataUrl) return null;
  return { dataUrl: photo.dataUrl, format: photo.format };
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)![1];
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
