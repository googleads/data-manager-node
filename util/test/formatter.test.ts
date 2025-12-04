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

import {expect} from 'chai';
import {UserDataFormatter, Encoding} from '../src';

describe('UserDataFormatter', () => {
  const formatter = new UserDataFormatter();
  const nullString = null as unknown as string;
  const undefString = undefined as unknown as string;

  describe('formatEmailAddress', () => {
    it('should format valid email addresses', () => {
      expect(formatter.formatEmailAddress('QuinnY@example.com')).to.equal(
        'quinny@example.com',
      );
      expect(formatter.formatEmailAddress('QuinnY@EXAMPLE.com')).to.equal(
        'quinny@example.com',
      );
    });

    it('should throw an error for invalid email addresses', () => {
      expect(() => formatter.formatEmailAddress(nullString)).to.throw();
      expect(() => formatter.formatEmailAddress(undefString)).to.throw();
      expect(() => formatter.formatEmailAddress('@example.com')).to.throw();
      expect(() => formatter.formatEmailAddress('quinn')).to.throw();
    });

    it('should handle Gmail variations', () => {
      expect(
        formatter.formatEmailAddress('jefferson.Loves.hiking@gmail.com'),
      ).to.equal('jeffersonloveshiking@gmail.com');
      expect(
        formatter.formatEmailAddress('j.e.f..ferson.Loves.hiking@gmail.com'),
      ).to.equal('jeffersonloveshiking@gmail.com');
      expect(
        formatter.formatEmailAddress('jefferson.Loves.hiking@googlemail.com'),
      ).to.equal('jeffersonloveshiking@googlemail.com');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format valid phone numbers', () => {
      const validInputsOutputs: {[key: string]: string} = {
        '1 800 555 0100': '+18005550100',
        '18005550100': '+18005550100',
        '+1 800-555-0100': '+18005550100',
        '441134960987': '+441134960987',
        '+441134960987': '+441134960987',
        '+44-113-496-0987': '+441134960987',
      };
      for (const [input, expected] of Object.entries(validInputsOutputs)) {
        expect(formatter.formatPhoneNumber(input)).to.equal(expected);
      }
    });

    it('should throw an error for invalid phone numbers', () => {
      expect(() => formatter.formatPhoneNumber(nullString)).to.throw();
      expect(() => formatter.formatPhoneNumber(undefString)).to.throw();
      expect(() => formatter.formatPhoneNumber('+abc-DEF')).to.throw();
      expect(() => formatter.formatPhoneNumber('++++')).to.throw();
    });
  });

  describe('formatGivenName', () => {
    it('should format valid given names', () => {
      expect(formatter.formatGivenName(' Alex   ')).to.equal('alex');
      expect(formatter.formatGivenName(' Mr. Alex   ')).to.equal('alex');
      expect(formatter.formatGivenName(' Mrs. Alex   ')).to.equal('alex');
      expect(formatter.formatGivenName(' Dr. Alex   ')).to.equal('alex');
      expect(formatter.formatGivenName(' Alex Dr.')).to.equal('alex dr.');
      expect(formatter.formatGivenName(' Mralex   ')).to.equal('mralex');
    });

    it('should throw an error for invalid given names', () => {
      expect(() => formatter.formatGivenName(nullString)).to.throw();
      expect(() => formatter.formatGivenName(undefString)).to.throw();
      expect(() => formatter.formatGivenName(' ')).to.throw();
      expect(() => formatter.formatGivenName(' Mr. ')).to.throw();
    });
  });

  describe('formatFamilyName', () => {
    it('should format valid family names', () => {
      expect(formatter.formatFamilyName(' Quinn   ')).to.equal('quinn');
      expect(formatter.formatFamilyName('Quinn-Alex')).to.equal('quinn-alex');
      expect(formatter.formatFamilyName(' Quinn, Jr.   ')).to.equal('quinn');
      expect(formatter.formatFamilyName(' Quinn,Jr.   ')).to.equal('quinn');
      expect(formatter.formatFamilyName(' Quinn Sr.  ')).to.equal('quinn');
      expect(formatter.formatFamilyName('quinn, jr. dds')).to.equal('quinn');
      expect(formatter.formatFamilyName('quinn, jr., dds')).to.equal('quinn');
      expect(formatter.formatFamilyName('Boardds')).to.equal('boardds');
      expect(formatter.formatFamilyName('lacparm')).to.equal('lacparm');
    });

    it('should throw an error for invalid family names', () => {
      expect(() => formatter.formatFamilyName(nullString)).to.throw();
      expect(() => formatter.formatFamilyName(undefString)).to.throw();
      expect(() => formatter.formatFamilyName(' ')).to.throw();
      expect(() => formatter.formatFamilyName(', Jr. ')).to.throw();
      expect(() => formatter.formatFamilyName(',Jr.,DDS ')).to.throw();
    });
  });

  describe('formatRegionCode', () => {
    it('should format valid region codes', () => {
      expect(formatter.formatRegionCode('us')).to.equal('US');
      expect(formatter.formatRegionCode('us  ')).to.equal('US');
      expect(formatter.formatRegionCode('  us  ')).to.equal('US');
    });

    it('should throw an error for invalid region codes', () => {
      expect(() => formatter.formatRegionCode(nullString)).to.throw();
      expect(() => formatter.formatRegionCode(undefString)).to.throw();
      expect(() => formatter.formatRegionCode('')).to.throw();
      expect(() => formatter.formatRegionCode('  ')).to.throw();
      expect(() => formatter.formatRegionCode('u')).to.throw();
      expect(() => formatter.formatRegionCode(' usa ')).to.throw();
      expect(() => formatter.formatRegionCode(' u s ')).to.throw();
      expect(() => formatter.formatRegionCode(' u2 ')).to.throw();
    });
  });

  describe('formatPostalCode', () => {
    it('should format valid postal codes', () => {
      expect(formatter.formatPostalCode('94045')).to.equal('94045');
      expect(formatter.formatPostalCode(' 94045  ')).to.equal('94045');
      expect(formatter.formatPostalCode('1229-076')).to.equal('1229-076');
      expect(formatter.formatPostalCode('  1229-076  ')).to.equal('1229-076');
    });

    it('should throw an error for invalid postal codes', () => {
      expect(() => formatter.formatPostalCode(nullString)).to.throw();
      expect(() => formatter.formatPostalCode(undefString)).to.throw();
      expect(() => formatter.formatPostalCode('')).to.throw();
      expect(() => formatter.formatPostalCode('  ')).to.throw();
    });
  });

  describe('hashString', () => {
    it('should hash valid strings', () => {
      const hashAndEncode = (s: string) =>
        formatter.hashString(s).toString('hex');
      expect(hashAndEncode('alexz@example.com')).to.equal(
        '509e933019bb285a134a9334b8bb679dff79d0ce023d529af4bd744d47b4fd8a',
      );
      expect(hashAndEncode('+18005550100')).to.equal(
        'fb4f73a6ec5fdb7077d564cdd22c3554b43ce49168550c3b12c547b78c517b30',
      );
    });

    it('should throw an error for invalid strings', () => {
      expect(() => formatter.hashString(nullString)).to.throw();
      expect(() => formatter.hashString(undefString)).to.throw();
      expect(() => formatter.hashString('')).to.throw();
      expect(() => formatter.hashString(' ')).to.throw();
      expect(() => formatter.hashString('  ')).to.throw();
    });
  });

  describe('hexEncode', () => {
    it('should hex-encode valid byte arrays', () => {
      expect(formatter.hexEncode(Buffer.from('acK123'))).to.equal(
        '61634b313233',
      );
      expect(formatter.hexEncode(Buffer.from('999_XYZ'))).to.equal(
        '3939395f58595a',
      );
    });

    it('should throw an error for invalid byte arrays', () => {
      expect(() => formatter.hexEncode(null as unknown as Buffer)).to.throw();
      expect(() =>
        formatter.hexEncode(undefined as unknown as Buffer),
      ).to.throw();
      expect(() => formatter.hexEncode(Buffer.from(''))).to.throw();
    });
  });

  describe('base64Encode', () => {
    it('should base64-encode valid byte arrays', () => {
      expect(formatter.base64Encode(Buffer.from('acK123'))).to.equal(
        'YWNLMTIz',
      );
      expect(formatter.base64Encode(Buffer.from('999_XYZ'))).to.equal(
        'OTk5X1hZWg==',
      );
    });

    it('should throw an error for invalid byte arrays', () => {
      expect(() =>
        formatter.base64Encode(null as unknown as Buffer),
      ).to.throw();
      expect(() =>
        formatter.base64Encode(undefined as unknown as Buffer),
      ).to.throw();
      expect(() => formatter.base64Encode(Buffer.from(''))).to.throw();
    });
  });

  describe('processEmailAddress', () => {
    it('should process email addresses with hex encoding', () => {
      const encodedHash =
        '509e933019bb285a134a9334b8bb679dff79d0ce023d529af4bd744d47b4fd8a';
      const variants = [
        'alexz@example.com',
        '  alexz@example.com',
        '  ALEXZ@example.com   ',
        '  alexz@EXAMPLE.com   ',
      ];
      for (const emailVariant of variants) {
        expect(
          formatter.processEmailAddress(emailVariant, Encoding.HEX),
        ).to.equal(encodedHash);
      }
    });

    it('should process email addresses with base64 encoding', () => {
      const encodedHash = 'UJ6TMBm7KFoTSpM0uLtnnf950M4CPVKa9L10TUe0/Yo=';
      const variants = [
        'alexz@example.com',
        '  alexz@example.com',
        '  ALEXZ@example.com   ',
        '  alexz@EXAMPLE.com   ',
      ];
      for (const emailVariant of variants) {
        expect(
          formatter.processEmailAddress(emailVariant, Encoding.BASE64),
        ).to.equal(encodedHash);
      }
    });
  });

  describe('processPhoneNumber', () => {
    it('should process phone numbers with hex encoding', () => {
      const encodedHash =
        'fb4f73a6ec5fdb7077d564cdd22c3554b43ce49168550c3b12c547b78c517b30';
      expect(
        formatter.processPhoneNumber('+18005550100', Encoding.HEX),
      ).to.equal(encodedHash);
      expect(
        formatter.processPhoneNumber('   +1-800-555-0100', Encoding.HEX),
      ).to.equal(encodedHash);
      expect(
        formatter.processPhoneNumber('1-800-555-0100   ', Encoding.HEX),
      ).to.equal(encodedHash);
    });

    it('should process phone numbers with base64 encoding', () => {
      const encodedHash = '+09zpuxf23B31WTN0iw1VLQ85JFoVQw7EsVHt4xRezA=';
      expect(
        formatter.processPhoneNumber('+18005550100', Encoding.BASE64),
      ).to.equal(encodedHash);
      expect(
        formatter.processPhoneNumber('   +1-800-555-0100', Encoding.BASE64),
      ).to.equal(encodedHash);
      expect(
        formatter.processPhoneNumber('1-800-555-0100   ', Encoding.BASE64),
      ).to.equal(encodedHash);
    });
  });
});
