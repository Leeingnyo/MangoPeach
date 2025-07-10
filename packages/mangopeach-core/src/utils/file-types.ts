const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const SUPPORTED_ARCHIVE_EXTENSIONS = ['.zip', '.cbz', '.rar', '.cbr'];

export function isImageFile(fileName: string): boolean {
  const lowercasedName = fileName.toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.some(ext => lowercasedName.endsWith(ext));
}

export function isArchiveFile(fileName: string): boolean {
  const lowercasedName = fileName.toLowerCase();
  return SUPPORTED_ARCHIVE_EXTENSIONS.some(ext => lowercasedName.endsWith(ext));
}
