import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { basename } from 'path';

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/heic',
  'image/heif',
] as const;

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
] as const;

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'text/plain',
  'text/csv',
] as const;

export const ALLOWED_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...AUDIO_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXT_TO_MIME: Record<string, AllowedMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ico: 'image/x-icon',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
};

const MIME_TO_EXT: Partial<Record<AllowedMimeType, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
  'application/rtf': 'rtf',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'application/vnd.oasis.opendocument.presentation': 'odp',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

/** Declared MIME aliases → canonical. */
const MIME_ALIASES: Record<string, AllowedMimeType> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
  'image/x-bmp': 'image/bmp',
  'image/x-ms-bmp': 'image/bmp',
  'audio/mp3': 'audio/mpeg',
  'audio/x-mpeg': 'audio/mpeg',
  'audio/wave': 'audio/wav',
  'application/x-pdf': 'application/pdf',
};

/** Per-category size limits (bytes). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_SVG_BYTES = 2 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
/** Multipart ceiling — must be >= largest allowed file. */
export const MAX_UPLOAD_BYTES = MAX_VIDEO_BYTES;

const REJECTED_MIME = new Set([
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
  'application/x-httpd-php',
  'application/x-sh',
  'application/x-executable',
  'application/x-msdownload',
  'application/x-dosexec',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
]);

const REJECTED_EXTENSIONS = new Set([
  'html',
  'htm',
  'js',
  'mjs',
  'cjs',
  'php',
  'phtml',
  'exe',
  'dll',
  'bat',
  'cmd',
  'sh',
  'bash',
  'ps1',
  'jar',
  'war',
  'zip',
  'rar',
  '7z',
  'gz',
  'tgz',
  'tar',
]);

const OOXML_MIMES = new Set<AllowedMimeType>([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const OLE_MIMES = new Set<AllowedMimeType>([
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
]);

const ODF_MIMES = new Set<AllowedMimeType>([
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
]);

const TEXT_MIMES = new Set<AllowedMimeType>(['text/plain', 'text/csv']);

export function isImageMime(mime: string): boolean {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export function isVideoMime(mime: string): boolean {
  return (VIDEO_MIME_TYPES as readonly string[]).includes(mime);
}

export function isAudioMime(mime: string): boolean {
  return (AUDIO_MIME_TYPES as readonly string[]).includes(mime);
}

export function isDocumentMime(mime: string): boolean {
  return (DOCUMENT_MIME_TYPES as readonly string[]).includes(mime);
}

/** Raster formats where sharp dimension extraction is expected. */
export function isRasterImageMime(mime: string): boolean {
  return (
    isImageMime(mime) &&
    mime !== 'image/svg+xml' &&
    mime !== 'image/x-icon' &&
    mime !== 'image/vnd.microsoft.icon'
  );
}

export function maxBytesForMime(mime: string): number {
  if (mime === 'image/svg+xml') return MAX_SVG_BYTES;
  if (isImageMime(mime)) return MAX_IMAGE_BYTES;
  if (isVideoMime(mime)) return MAX_VIDEO_BYTES;
  if (isAudioMime(mime)) return MAX_AUDIO_BYTES;
  return MAX_DOCUMENT_BYTES;
}

export function sanitizeOriginalFilename(raw: string): string {
  const base = basename(String(raw || 'file').replace(/\\/g, '/'));
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .trim();
  const limited = cleaned.slice(0, 180);
  return limited || 'file';
}

export function normalizeExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) {
    return '';
  }
  return parts[parts.length - 1].replace(/[^a-z0-9]/g, '');
}

function readFtypBrand(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer.subarray(4, 8).toString('ascii') !== 'ftyp') return null;
  return buffer.subarray(8, 12).toString('ascii').toLowerCase();
}

function bufferIncludesAscii(buffer: Buffer, needle: string): boolean {
  return buffer.toString('latin1').toLowerCase().includes(needle.toLowerCase());
}

function assertSafeSvg(buffer: Buffer): void {
  const text = buffer.toString('utf8');
  const normalized = text.replace(/^\uFEFF/, '').trimStart().toLowerCase();
  if (!normalized.includes('<svg')) {
    throw new UnsupportedMediaTypeException(
      'File content does not match SVG format.',
    );
  }

  const dangerous = [
    /<script[\s>]/i,
    /<\/script>/i,
    /\bon[a-z]+\s*=/i,
    /javascript\s*:/i,
    /data\s*:\s*text\/html/i,
    /<foreignobject[\s>]/i,
    /<iframe[\s>]/i,
    /<embed[\s>]/i,
    /<object[\s>]/i,
    /xlink:href\s*=\s*["']\s*javascript:/i,
  ];
  for (const pattern of dangerous) {
    if (pattern.test(text)) {
      throw new UnsupportedMediaTypeException(
        'SVG contains potentially dangerous content and was rejected.',
      );
    }
  }
}

function assertMostlyText(buffer: Buffer): void {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) {
      throw new UnsupportedMediaTypeException(
        'Text file contains binary null bytes.',
      );
    }
    // Allow common UTF-8 / whitespace / printable
    if (byte < 7 || (byte > 13 && byte < 32 && byte !== 27)) {
      suspicious += 1;
    }
  }
  if (suspicious > sample.length * 0.3) {
    throw new UnsupportedMediaTypeException(
      'File content does not look like plain text.',
    );
  }
}

function detectMimeFromMagic(
  buffer: Buffer,
  expected: AllowedMimeType,
): AllowedMimeType | null {
  if (buffer.length < 4) {
    return null;
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // GIF
  const gifHeader = buffer.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return 'image/gif';
  }

  // WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  // WAV
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    return expected === 'audio/x-wav' ? 'audio/x-wav' : 'audio/wav';
  }

  // BMP
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'image/bmp';
  }

  // TIFF
  if (
    (buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00) ||
    (buffer[0] === 0x4d &&
      buffer[1] === 0x4d &&
      buffer[2] === 0x00 &&
      buffer[3] === 0x2a)
  ) {
    return 'image/tiff';
  }

  // ICO
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00
  ) {
    return expected === 'image/vnd.microsoft.icon'
      ? 'image/vnd.microsoft.icon'
      : 'image/x-icon';
  }

  // PDF
  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') {
    return 'application/pdf';
  }

  // RTF
  if (buffer.subarray(0, 5).toString('ascii') === '{\\rtf') {
    return 'application/rtf';
  }

  // MP3
  if (
    buffer.subarray(0, 3).toString('ascii') === 'ID3' ||
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  ) {
    if (expected === 'audio/mpeg' || expected === 'audio/aac') {
      return expected;
    }
    return 'audio/mpeg';
  }

  // WebM / Matroska EBML
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return 'video/webm';
  }

  // ISO BMFF: MP4 / MOV / AVIF / HEIC / M4A
  const brand = readFtypBrand(buffer);
  if (brand) {
    const brands = buffer
      .subarray(8, Math.min(buffer.length, 64))
      .toString('ascii')
      .toLowerCase();
    if (brands.includes('avif') || brands.includes('avis')) {
      return 'image/avif';
    }
    if (
      brands.includes('heic') ||
      brands.includes('heif') ||
      brands.includes('mif1') ||
      brands.includes('msf1')
    ) {
      return expected === 'image/heif' ? 'image/heif' : 'image/heic';
    }
    if (expected === 'audio/mp4' || brands.includes('m4a ')) {
      return 'audio/mp4';
    }
    if (
      expected === 'video/quicktime' ||
      brand === 'qt  ' ||
      brands.includes('qt  ')
    ) {
      return 'video/quicktime';
    }
    if (
      brands.includes('isom') ||
      brands.includes('iso2') ||
      brands.includes('mp41') ||
      brands.includes('mp42') ||
      brands.includes('avc1') ||
      brands.includes('dash') ||
      brand === 'mp4 '
    ) {
      return 'video/mp4';
    }
  }

  // OLE Compound (doc/xls/ppt)
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    if (OLE_MIMES.has(expected)) {
      return expected;
    }
    return null;
  }

  // ZIP-based: OOXML / ODF (not generic zip uploads)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    if (OOXML_MIMES.has(expected)) {
      if (
        expected.includes('wordprocessingml') &&
        !bufferIncludesAscii(buffer, 'word/')
      ) {
        return null;
      }
      if (
        expected.includes('spreadsheetml') &&
        !bufferIncludesAscii(buffer, 'xl/')
      ) {
        return null;
      }
      if (
        expected.includes('presentationml') &&
        !bufferIncludesAscii(buffer, 'ppt/')
      ) {
        return null;
      }
      if (!bufferIncludesAscii(buffer, '[content_types].xml')) {
        // Some writers store the name split; still require PK + expected folder
        if (
          !bufferIncludesAscii(buffer, 'word/') &&
          !bufferIncludesAscii(buffer, 'xl/') &&
          !bufferIncludesAscii(buffer, 'ppt/')
        ) {
          return null;
        }
      }
      return expected;
    }
    if (ODF_MIMES.has(expected)) {
      if (!bufferIncludesAscii(buffer, 'mimetype')) {
        return null;
      }
      return expected;
    }
    return null;
  }

  // SVG / text — content heuristics (no classic magic)
  if (expected === 'image/svg+xml') {
    assertSafeSvg(buffer);
    return 'image/svg+xml';
  }
  if (TEXT_MIMES.has(expected)) {
    assertMostlyText(buffer);
    return expected;
  }

  return null;
}

function canonicalDeclaredMime(raw: string): string {
  const normalized = raw.split(';')[0].trim().toLowerCase();
  if (!normalized || normalized === 'application/octet-stream') {
    return '';
  }
  return MIME_ALIASES[normalized] || normalized;
}

export type ValidatedUpload = {
  originalFilename: string;
  extension: string;
  mimeType: AllowedMimeType;
  size: number;
  buffer: Buffer;
};

/**
 * Authoritative upload validation: extension, declared MIME, magic bytes, size.
 */
export function validateUploadBuffer(params: {
  originalFilename: string;
  declaredMime: string;
  buffer: Buffer;
}): ValidatedUpload {
  const originalFilename = sanitizeOriginalFilename(params.originalFilename);
  const extension = normalizeExtension(originalFilename);
  const declaredMime = canonicalDeclaredMime(params.declaredMime || '');
  const buffer = params.buffer;
  const size = buffer.length;

  if (!size) {
    throw new BadRequestException('Uploaded file is empty.');
  }

  if (REJECTED_EXTENSIONS.has(extension) || REJECTED_MIME.has(declaredMime)) {
    throw new UnsupportedMediaTypeException(
      'This file type is not allowed.',
    );
  }

  if (!extension || !(extension in EXT_TO_MIME)) {
    throw new UnsupportedMediaTypeException(
      'File extension is not allowed. See Media Library help for supported types.',
    );
  }

  const expectedFromExt = EXT_TO_MIME[extension];

  if (
    declaredMime &&
    !(ALLOWED_MIME_TYPES as readonly string[]).includes(declaredMime)
  ) {
    throw new UnsupportedMediaTypeException(
      `MIME type "${declaredMime}" is not allowed.`,
    );
  }

  // Allow icon mime variants to match .ico
  const declaredMatchesExt =
    !declaredMime ||
    declaredMime === expectedFromExt ||
    (extension === 'ico' &&
      (declaredMime === 'image/x-icon' ||
        declaredMime === 'image/vnd.microsoft.icon')) ||
    (extension === 'wav' &&
      (declaredMime === 'audio/wav' || declaredMime === 'audio/x-wav')) ||
    (extension === 'heic' &&
      (declaredMime === 'image/heic' || declaredMime === 'image/heif')) ||
    (extension === 'heif' &&
      (declaredMime === 'image/heic' || declaredMime === 'image/heif'));

  if (!declaredMatchesExt) {
    throw new UnsupportedMediaTypeException(
      'File extension and MIME type do not match.',
    );
  }

  const expected: AllowedMimeType =
    declaredMime &&
    (ALLOWED_MIME_TYPES as readonly string[]).includes(declaredMime)
      ? (declaredMime as AllowedMimeType)
      : expectedFromExt;

  const magicMime = detectMimeFromMagic(buffer, expected);
  if (!magicMime) {
    throw new UnsupportedMediaTypeException(
      'File content does not match a supported format.',
    );
  }

  // Detected type must be compatible with extension mapping
  const compatible =
    magicMime === expectedFromExt ||
    magicMime === expected ||
    (extension === 'ico' &&
      (magicMime === 'image/x-icon' ||
        magicMime === 'image/vnd.microsoft.icon')) ||
    (extension === 'wav' &&
      (magicMime === 'audio/wav' || magicMime === 'audio/x-wav')) ||
    ((extension === 'heic' || extension === 'heif') &&
      (magicMime === 'image/heic' || magicMime === 'image/heif'));

  if (!compatible) {
    throw new UnsupportedMediaTypeException(
      'File content does not match the declared type.',
    );
  }

  const mimeType = magicMime;
  const maxBytes = maxBytesForMime(mimeType);
  if (size > maxBytes) {
    throw new PayloadTooLargeException(
      `File exceeds the maximum size of ${Math.floor(maxBytes / (1024 * 1024))} MB for this type.`,
    );
  }

  const outExt =
    MIME_TO_EXT[mimeType] ||
    extension ||
    MIME_TO_EXT[expectedFromExt] ||
    'bin';

  return {
    originalFilename,
    extension: outExt,
    mimeType,
    size,
    buffer,
  };
}
