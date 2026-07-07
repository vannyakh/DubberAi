/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Segment } from '@dubbercute/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseSegments(text: string): Segment[] {
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const match = line.match(/\[(\d{2}):(\d{2})\]\s+([^:]+):\s+(.*)/);
    if (match) {
      return {
        time: parseInt(match[1], 10) * 60 + parseInt(match[2], 10),
        speaker: match[3],
        text: match[4],
        raw: line
      };
    }
    return { time: 0, speaker: '', text: line, raw: line };
  });
}

export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return parseInt(parts[0], 10);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
}

export const LANGUAGES = [
  { code: 'Khmer', name: 'Khmer (ភាសាខ្មែរ)' },
  { code: 'Spanish', name: 'Spanish' },
  { code: 'French', name: 'French' },
  { code: 'German', name: 'German' },
  { code: 'Chinese', name: 'Chinese' },
  { code: 'Japanese', name: 'Japanese' },
  { code: 'Korean', name: 'Korean' },
  { code: 'Vietnamese', name: 'Vietnamese' },
  { code: 'Thai', name: 'Thai' },
  { code: 'Hindi', name: 'Hindi' },
];

export const VOICES = [
  { id: 'Kore', label: 'Female (Kore)' },
  { id: 'Zephyr', label: 'Female (Zephyr)' },
  { id: 'Puck', label: 'Male (Puck)' },
  { id: 'Charon', label: 'Male (Charon)' },
  { id: 'Fenrir', label: 'Male (Fenrir)' },
];
