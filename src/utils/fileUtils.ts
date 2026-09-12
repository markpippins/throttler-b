/**
 * File & Storage utility functions
 */

export interface FormatFileSizeOptions {
  /**
   * Number of decimal places (default: 1, or 2 for detailed)
   */
  decimals?: number;
  /**
   * Custom fallback string when bytes is undefined/null (default: '--')
   */
  fallback?: string;
  /**
   * Whether the target node is a directory/folder
   */
  isFolder?: boolean;
  /**
   * Custom folder label to return if isFolder is true and no size exists (default: 'Folder')
   */
  folderLabel?: string;
  /**
   * Whether to include the exact byte count in parentheses, e.g. "1.45 MB (1,520,640 bytes)"
   */
  detailed?: boolean;
  /**
   * Use full word units ("Bytes", "KB", "MB") vs abbreviated ("B", "KB", "MB")
   */
  longUnits?: boolean;
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
const LONG_SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];

/**
 * Converts a raw byte count into a formatted, human-readable file size string.
 * Examples:
 *   formatFileSize(0) -> "0 B"
 *   formatFileSize(1024) -> "1.0 KB"
 *   formatFileSize(14200, 2) -> "13.87 KB"
 *   formatFileSize(14200, { detailed: true }) -> "13.87 KB (14,200 bytes)"
 *   formatFileSize(undefined, { isFolder: true }) -> "Folder"
 */
export function formatFileSize(
  bytes?: number | null,
  optionsOrDecimals: FormatFileSizeOptions | number = 1
): string {
  const options: FormatFileSizeOptions =
    typeof optionsOrDecimals === 'number'
      ? { decimals: optionsOrDecimals }
      : optionsOrDecimals || {};

  const {
    decimals = options.detailed ? 2 : 1,
    fallback = '--',
    isFolder = false,
    folderLabel = 'Folder',
    detailed = false,
    longUnits = false,
  } = options;

  if (isFolder && (bytes === undefined || bytes === null)) {
    return folderLabel;
  }

  if (bytes === undefined || bytes === null || isNaN(bytes)) {
    return fallback;
  }

  if (bytes === 0) {
    const zeroUnit = longUnits ? 'Bytes' : 'B';
    return detailed ? `0 ${zeroUnit} (0 bytes)` : `0 ${zeroUnit}`;
  }

  const isNegative = bytes < 0;
  const absBytes = Math.abs(bytes);

  const k = 1024;
  const unitList = longUnits ? LONG_SIZE_UNITS : SIZE_UNITS;
  const i = Math.min(
    Math.floor(Math.log(absBytes) / Math.log(k)),
    unitList.length - 1
  );

  let formattedNumber: string;
  if (i === 0) {
    // Exact bytes don't need decimal points
    formattedNumber = absBytes.toString();
  } else {
    const rawValue = absBytes / Math.pow(k, i);
    formattedNumber = rawValue.toFixed(decimals);
    // Strip trailing zeroes if they aren't needed, e.g. 1.00 -> 1 or 1.50 -> 1.5 when precision allows
    if (!detailed && formattedNumber.includes('.')) {
      formattedNumber = parseFloat(formattedNumber).toString();
    }
  }

  const sign = isNegative ? '-' : '';
  const readable = `${sign}${formattedNumber} ${unitList[i]}`;

  if (detailed) {
    const localizedExact = absBytes.toLocaleString();
    const byteNoun = absBytes === 1 ? 'byte' : 'bytes';
    return `${readable} (${sign}${localizedExact} ${byteNoun})`;
  }

  return readable;
}

/**
 * Shorthand alias for byte formatting
 */
export function formatBytes(bytes?: number | null, decimals: number = 1): string {
  return formatFileSize(bytes, { decimals });
}
