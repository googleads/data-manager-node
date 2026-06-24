#!/usr/bin/env node
// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

import {IngestionServiceClient} from '@google-ads/datamanager';
import {protos} from '@google-ads/datamanager';
const {
  AudienceMember,
  CompositeData,
  Destination,
  Encoding: DataManagerEncoding,
  Consent,
  ConsentStatus,
  IngestAudienceMembersRequest,
  IpData,
  ProductAccount,
  TermsOfService,
  TermsOfServiceStatus,
  UserData,
  UserIdentifier,
} = protos.google.ads.datamanager.v1;
import {UserDataFormatter, Encoding} from '@google-ads/data-manager-util';
import * as fs from 'fs';
import * as yargs from 'yargs';

const MAX_MEMBERS_PER_REQUEST = 10000;

interface Arguments {
  operating_account_type: string;
  operating_account_id: string;
  audience_id: string;
  json_file: string;
  validate_only: boolean;
  login_account_type?: string;
  login_account_id?: string;
  linked_account_type?: string;
  linked_account_id?: string;
  [x: string]: unknown;
}

interface MemberRow {
  emails?: string[];
  phoneNumbers?: string[];
  ipInfos?: {
    ipAddress: string;
    observeStartTime?: string;
    observeEndTime?: string;
  }[];
}

/**
 * The main function for the IngestAudienceMembers sample.
 */
async function main() {
  const argv: Arguments = yargs
    .option('operating_account_type', {
      describe: 'The account type of the operating account.',
      type: 'string',
      required: true,
    })
    .option('operating_account_id', {
      describe: 'The ID of the operating account.',
      type: 'string',
      required: true,
    })
    .option('audience_id', {
      describe: 'The ID of the destination audience.',
      type: 'string',
      required: true,
    })
    .option('json_file', {
      describe: 'JSON file containing user data to ingest.',
      type: 'string',
      required: true,
    })
    .option('validate_only', {
      describe: 'Whether to enable validate_only on the request.',
      type: 'boolean',
      default: true,
    })
    .option('login_account_type', {
      describe: 'The account type of the login account.',
      type: 'string',
    })
    .option('login_account_id', {
      describe: 'The ID of the login account.',
      type: 'string',
    })
    .option('linked_account_type', {
      describe: 'The account type of the linked account.',
      type: 'string',
    })
    .option('linked_account_id', {
      describe: 'The ID of the linked account.',
      type: 'string',
    })
    .option('config', {
      describe: 'Path to a JSON file with arguments.',
      type: 'string',
    })
    .config('config')
    .check((args: Arguments) => {
      if (
        (args.login_account_type && !args.login_account_id) ||
        (!args.login_account_type && args.login_account_id)
      ) {
        throw new Error(
          'Must specify either both or neither of login account type and ' +
            'login account ID',
        );
      }
      if (
        (args.linked_account_type && !args.linked_account_id) ||
        (!args.linked_account_type && args.linked_account_id)
      ) {
        throw new Error(
          'Must specify either both or neither of linked account ' +
            'type and linked account ID',
        );
      }
      return true;
    })
    .parseSync();

  const formatter = new UserDataFormatter();

  const memberRows: MemberRow[] = await readMemberData(argv.json_file);

  // Builds the audience_members collection for the request.
  const audienceMembers = [];
  for (const memberRow of memberRows) {
    const userData = UserData.create();

    // Adds a UserIdentifier for each valid email address for the member.
    for (const email of memberRow.emails || []) {
      try {
        const processedEmail = formatter.processEmailAddress(
          email,
          Encoding.HEX,
        );
        userData.userIdentifiers.push(
          UserIdentifier.create({emailAddress: processedEmail}),
        );
      } catch (e) {
        // Skip invalid input.
      }
    }

    // Adds a UserIdentifier for each valid phone number for the member.
    for (const phone of memberRow.phoneNumbers || []) {
      try {
        const processedPhone = formatter.processPhoneNumber(
          phone,
          Encoding.HEX,
        );
        userData.userIdentifiers.push(
          UserIdentifier.create({phoneNumber: processedPhone}),
        );
      } catch (e) {
        // Skip invalid input.
      }
    }

    // Process IP address information
    const ipDatas = [];
    for (const ipInfo of memberRow.ipInfos || []) {
      const googleAdsAccountTypeValue = ProductAccount.AccountType.GOOGLE_ADS;
      if (operatingAccountType !== googleAdsAccountTypeValue) {
        console.log(
          `Skipping IP address information for operating account type ${operatingAccountType}. ` +
            `Sending IP address is only supported for operating account type GOOGLE_ADS.`,
        );
      }

      const ipAddress = (ipInfo.ipAddress || '').trim();
      if (!ipAddress) {
        console.log('Skipping IP address information with no IP address');
        continue;
      }

      const ipData = IpData.create({ipAddress});

      if (ipInfo.observeStartTime) {
        const startTimeStr = ipInfo.observeStartTime.trim();
        if (startTimeStr) {
          try {
            const date = new Date(startTimeStr);
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date');
            }
            ipData.observeStartTime = {
              seconds: Math.floor(date.getTime() / 1000),
              nanos: (date.getTime() % 1000) * 1e6,
            };
          } catch (e) {
            console.log(
              `Ignoring observe start time '${startTimeStr}' since it can't be parsed`,
            );
          }
        }
      }

      if (ipInfo.observeEndTime) {
        const endTimeStr = ipInfo.observeEndTime.trim();
        if (endTimeStr) {
          try {
            const date = new Date(endTimeStr);
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date');
            }
            ipData.observeEndTime = {
              seconds: Math.floor(date.getTime() / 1000),
              nanos: (date.getTime() % 1000) * 1e6,
            };
          } catch (e) {
            console.log(
              `Ignoring observe end time '${endTimeStr}' since it can't be parsed`,
            );
          }
        }
      }

      ipDatas.push(ipData);
    }

    if (userData.userIdentifiers.length > 0 || ipDatas.length > 0) {
      const compositeData = CompositeData.create();
      if (userData.userIdentifiers.length > 0) {
        compositeData.userData = userData;
      }
      if (ipDatas.length > 0) {
        compositeData.ipData = ipDatas;
      }
      audienceMembers.push(AudienceMember.create({compositeData}));
    } else {
      console.warn('Ignoring line. No data.');
    }
  }

  // Sets up the Destination.
  const operatingAccountType = convertToAccountType(
    argv.operating_account_type,
    'operating_account_type',
  );

  const destination = Destination.create({
    operatingAccount: ProductAccount.create({
      accountType: operatingAccountType,
      accountId: argv.operating_account_id,
    }),
    productDestinationId: argv.audience_id,
  });

  // The login account is optional.
  if (argv.login_account_type) {
    const loginAccountType = convertToAccountType(
      argv.login_account_type,
      'login_account_type',
    );
    destination.loginAccount = ProductAccount.create({
      accountType: loginAccountType,
      accountId: argv.login_account_id,
    });
  }

  // The linked account is optional.
  if (argv.linked_account_type) {
    const linkedAccountType = convertToAccountType(
      argv.linked_account_type,
      'linked_account_type',
    );
    destination.linkedAccount = ProductAccount.create({
      accountType: linkedAccountType,
      accountId: argv.linked_account_id,
    });
  }

  const client = new IngestionServiceClient();

  let requestCount = 0;
  // Batches requests to send up to the maximum number of audience members per request.
  for (let i = 0; i < audienceMembers.length; i += MAX_MEMBERS_PER_REQUEST) {
    requestCount++;
    const audienceMembersBatch = audienceMembers.slice(
      i,
      i + MAX_MEMBERS_PER_REQUEST,
    );

    const request = IngestAudienceMembersRequest.create({
      destinations: [destination],
      // Adds members from the current batch.
      audienceMembers: audienceMembersBatch,
      consent: Consent.create({
        adUserData: ConsentStatus.CONSENT_GRANTED,
        adPersonalization: ConsentStatus.CONSENT_GRANTED,
      }),
      termsOfService: TermsOfService.create({
        customerMatchTermsOfServiceStatus: TermsOfServiceStatus.ACCEPTED,
      }),
      // Sets encoding to match the encoding used.
      encoding: DataManagerEncoding.HEX,
      // Sets validate_only. If true, then the Data Manager API only validates the request
      // but doesn't apply changes.
      validateOnly: argv.validate_only,
    });

    console.log(`Request #${requestCount}:\n `, request);

    const [response] = await client.ingestAudienceMembers(request);
    console.log(`Response for request #${requestCount}:\n `, response);
  }
  console.log(`# of requests sent: ${requestCount}`);
}

/**
 * Reads the user data from the given JSON file.
 * @param {string} jsonFile The path to the JSON file.
 * @return {Promise<MemberRow[]>} A promise that resolves with an array of user data.
 */
async function readMemberData(jsonFile: string): Promise<MemberRow[]> {
  const data = await fs.promises.readFile(jsonFile, 'utf8');
  return JSON.parse(data) as MemberRow[];
}

/**
 * Validates that a given string is an enum value for the AccountType enum, and
 * if validation passes, returns the AccountType enum value.
 * @param proposedValue the name of an AccountType enum value
 * @param paramName the name of the parameter to use in the error message if validation fails
 * @returns {protos.google.ads.datamanager.v1.ProductAccount.AccountType} The corresponding enum value.
 * @throws {Error} If the string is not an AccountType enum value.
 */
function convertToAccountType(
  proposedValue: string,
  paramName: string,
): protos.google.ads.datamanager.v1.ProductAccount.AccountType {
  const AccountType = ProductAccount.AccountType;
  const accountTypeEnumNames = Object.keys(AccountType).filter(key =>
    isNaN(Number(key)),
  );
  if (!accountTypeEnumNames.includes(proposedValue)) {
    throw new Error(`Invalid ${paramName}: ${proposedValue}`);
  }
  return AccountType[proposedValue as keyof typeof AccountType];
}

if (require.main === module) {
  main().catch(console.error);
}
