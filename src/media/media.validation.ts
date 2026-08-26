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
] as const;

export const DOCUMENT_MIME_TYPES = ['application/pdf'] as const;

export const ALLOWED_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXT_TO_MIME: Record<string, AllowedMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
};

const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

/** Per-type size limits (bytes). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
/** Multipart ceiling — must be >= largest allowed file. */
export const MAX_UPLOAD_BYTES = MAX_PDF_BYTES;

const REJECTED_MIME = new Set([
  'image/svg+xml',
  'text/html',
  'application/javascript',
  'text/javascript',
  'application/x-httpd-php',
  'application/x-sh',
  'application/x-executable',
  'application/zip',
  'application/x-zip-compressed',
]);

export function isImageMime(mime: string): boolean {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export function isDocumentMime(mime: string): boolean {
  return (DOCUMENT_MIME_TYPES as readonly string[]).includes(mime);
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

function detectMimeFromMagic(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length < 12) {
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
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // GIF
  const gifHeader = buffer.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return 'image/gif';
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  // PDF
  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') {
    return 'application/pdf';
  }

  return null;
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
  const declaredMimeRaw = (params.declaredMime || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  // Browsers/clients often send application/octet-stream; treat as undeclared.
  const declaredMime =
    !declaredMimeRaw || declaredMimeRaw === 'application/octet-stream'
      ? ''
      : declaredMimeRaw;
  const buffer = params.buffer;
  const size = buffer.length;

  if (!size) {
    throw new BadRequestException('Uploaded file is empty.');
  }

  if (REJECTED_MIME.has(declaredMime) || extension === 'svg') {
    throw new UnsupportedMediaTypeException(
      'This file type is not allowed.',
    );
  }

  if (!extension || !(extension in EXT_TO_MIME)) {
    throw new UnsupportedMediaTypeException(
      'File extension is not allowed. Allowed: jpg, jpeg, png, webp, gif, pdf.',
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

  if (declaredMime && declaredMime !== expectedFromExt) {
    // Allow image/jpeg with .jpg/.jpeg only; otherwise reject spoofed pairs
    throw new UnsupportedMediaTypeException(
      'File extension and MIME type do not match.',
    );
  }

  const magicMime = detectMimeFromMagic(buffer);
  if (!magicMime) {
    throw new UnsupportedMediaTypeException(
      'File content does not match a supported format.',
    );
  }

  if (magicMime !== expectedFromExt) {
    throw new UnsupportedMediaTypeException(
      'File content does not match the declared type.',
    );
  }

  const maxBytes = isImageMime(magicMime) ? MAX_IMAGE_BYTES : MAX_PDF_BYTES;
  if (size > maxBytes) {
    throw new PayloadTooLargeException(
      `File exceeds the maximum size of ${Math.floor(maxBytes / (1024 * 1024))} MB for this type.`,
    );
  }

  return {
    originalFilename,
    extension: MIME_TO_EXT[magicMime],
    mimeType: magicMime,
    size,
    buffer,
  };
}
