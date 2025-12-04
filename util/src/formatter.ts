// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as crypto from 'crypto';

/**
 * Utility for normalizing and formatting user data.
 * @see {@link https://developers.google.com/google-ads/api/docs/conversions/upload-clicks#javascript}
 */
export class UserDataFormatter {
  formatEmailAddress(emailAddress: string): string {
    if (!emailAddress) {
      throw new Error('Email address is null or empty.');
    }
    const trimmedEmail = emailAddress.trim();
    if (trimmedEmail === '') {
      throw new Error('Email address is empty or blank.');
    }
    if (trimmedEmail.includes(' ')) {
      throw new Error('Email address contains intermediate whitespace.');
    }

    const emailParts = trimmedEmail.toLowerCase().split('@');
    if (emailParts.length !== 2) {
      throw new Error('Email is not of the form user@domain');
    }

    let username = emailParts[0];
    const domain = emailParts[1];

    if (!username) {
      throw new Error('Email address without the domain is empty');
    }
    if (!domain) {
      throw new Error('Domain of email address is empty');
    }

    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      username = username.replace(/\./g, '');
    }

    if (!username) {
      throw new Error(
        'Email address without the domain name is empty after normalization',
      );
    }

    return `${username}@${domain}`;
  }

  formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) {
      throw new Error('Phone number is null or empty.');
    }
    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone === '') {
      throw new Error('Phone number is empty or blank.');
    }

    const digitsOnly = trimmedPhone.replace(/\D/g, '');

    if (digitsOnly === '') {
      throw new Error('Phone number contains no digits.');
    }

    return `+${digitsOnly}`;
  }

  formatGivenName(givenName: string): string {
    if (!givenName) {
      throw new Error('Given name is null or empty.');
    }
    const trimmedGivenName = givenName.trim().toLowerCase();
    if (trimmedGivenName === '') {
      throw new Error('Given name is empty or blank.');
    }
    const withoutPrefix = trimmedGivenName
      .replace(/^(?:mr|mrs|ms|dr)\.(?:\s|$)/, '')
      .trim();
    if (withoutPrefix === '') {
      throw new Error('Given name consists solely of a prefix.');
    }
    return withoutPrefix;
  }

  formatFamilyName(familyName: string): string {
    if (!familyName) {
      throw new Error('Family name is null or empty.');
    }
    const trimmedFamilyName = familyName.trim().toLowerCase();
    if (trimmedFamilyName === '') {
      throw new Error('Family name is empty or blank.');
    }

    let withoutSuffix = trimmedFamilyName;
    const suffixPattern = new RegExp(
      String.raw`
            (?:,\s*|\s+)
            (?:jr\.?|sr\.?|2nd|3rd|ii|iii|iv|v|vi|cpa|dc|dds|vm|jd|md|phd)
            \s?$
        `.replace(/\s+/g, ''), // Strip all whitespace for a single-line regex
    );
    while (suffixPattern.test(withoutSuffix)) {
      withoutSuffix = withoutSuffix.replace(suffixPattern, '');
    }

    if (withoutSuffix === '') {
      throw new Error('Family name consists solely of a suffix.');
    }
    return withoutSuffix;
  }

  formatRegionCode(regionCode: string): string {
    if (!regionCode) {
      throw new Error('Region code is null or empty.');
    }
    const trimmedRegionCode = regionCode.trim().toUpperCase();
    if (trimmedRegionCode === '') {
      throw new Error('Region code is empty or blank.');
    }
    if (trimmedRegionCode.length !== 2) {
      throw new Error(
        `Region code length is ${trimmedRegionCode.length}. Length must be 2`,
      );
    }
    if (!/^[A-Z]+$/.test(trimmedRegionCode)) {
      throw new Error('Region code contains characters other than A-Z');
    }
    return trimmedRegionCode;
  }

  formatPostalCode(postalCode: string): string {
    if (!postalCode) {
      throw new Error('Postal code is null or empty.');
    }
    const trimmedPostalCode = postalCode.trim();
    if (trimmedPostalCode === '') {
      throw new Error('Postal code is empty or blank.');
    }
    return trimmedPostalCode;
  }

  hashString(s: string): Buffer {
    if (s === null || s === undefined) {
      throw new Error('String is null.');
    }
    if (s.trim() === '') {
      throw new Error('String is empty or blank.');
    }
    return crypto.createHash('sha256').update(s).digest();
  }

  hexEncode(bytes: Buffer): string {
    if (!bytes) {
      throw new Error('Byte array is null.');
    }
    if (bytes.length === 0) {
      throw new Error('Byte array is empty.');
    }
    return bytes.toString('hex');
  }

  base64Encode(bytes: Buffer): string {
    if (!bytes) {
      throw new Error('Byte array is null.');
    }
    if (bytes.length === 0) {
      throw new Error('Byte array is empty.');
    }
    return bytes.toString('base64');
  }

  processEmailAddress(email: string, encoding: Encoding): string {
    return this.hashAndEncode(this.formatEmailAddress(email), encoding);
  }

  processPhoneNumber(phoneNumber: string, encoding: Encoding): string {
    return this.hashAndEncode(this.formatPhoneNumber(phoneNumber), encoding);
  }

  processGivenName(givenName: string, encoding: Encoding): string {
    return this.hashAndEncode(this.formatGivenName(givenName), encoding);
  }

  processFamilyName(familyName: string, encoding: Encoding): string {
    return this.hashAndEncode(this.formatFamilyName(familyName), encoding);
  }

  processRegionCode(regionCode: string): string {
    return this.formatRegionCode(regionCode);
  }

  processPostalCode(postalCode: string): string {
    return this.formatPostalCode(postalCode);
  }

  private hashAndEncode(normalizedString: string, encoding: Encoding): string {
    const hashBytes = this.hashString(normalizedString);
    return this.encode(hashBytes, encoding);
  }

  private encode(bytes: Buffer, encoding: Encoding): string {
    if (encoding === 'hex') {
      return this.hexEncode(bytes);
    } else if (encoding === 'base64') {
      return this.base64Encode(bytes);
    } else {
      throw new Error(`Invalid encoding: ${encoding}`);
    }
  }
}

export enum Encoding {
  HEX = 'hex',
  BASE64 = 'base64',
}
