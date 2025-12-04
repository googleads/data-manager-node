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
  Event: DataManagerEvent,
  Destination,
  Encoding: DataManagerEncoding,
  EventSource,
  Consent,
  ConsentStatus,
  IngestEventsRequest,
  ProductAccount,
  UserData,
  UserIdentifier,
} = protos.google.ads.datamanager.v1;
import {UserDataFormatter, Encoding} from '@google-ads/data-manager-util';
import * as fs from 'fs';
import * as yargs from 'yargs';

const MAX_EVENTS_PER_REQUEST = 10000;

interface Arguments {
  operating_account_type: string;
  operating_account_id: string;
  conversion_action_id: string;
  json_file: string;
  validate_only: boolean;
  login_account_type?: string;
  login_account_id?: string;
  linked_account_type?: string;
  linked_account_id?: string;
  [x: string]: unknown;
}

interface EventRow {
  timestamp: string;
  transactionId: string;
  eventSource?: string;
  gclid?: string;
  currency?: string;
  value?: number;
  emails?: string[];
  phoneNumbers?: string[];
}

/**
 * The main function for the IngestEvents sample.
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
    .option('conversion_action_id', {
      describe: 'The ID of the conversion action.',
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
          'Must specify either both or neither of login account type ' +
            'and login account ID',
        );
      }
      if (
        (args.linked_account_type && !args.linked_account_id) ||
        (!args.linked_account_type && args.linked_account_id)
      ) {
        throw new Error(
          'Must specify either both or neither of linked account type ' +
            'and linked account ID',
        );
      }
      return true;
    })
    .parseSync();

  // Reads event data from the JSON file.
  const eventRows: EventRow[] = readEventDataFile(argv.json_file);

  // Builds the events collection for the request.
  const events = [];
  const formatter = new UserDataFormatter();
  for (const eventRow of eventRows) {
    const event = DataManagerEvent.create();
    try {
      const date = new Date(eventRow.timestamp);
      event.eventTimestamp = {
        seconds: Math.floor(date.getTime() / 1000),
        nanos: (date.getTime() % 1000) * 1e6,
      };
    } catch (e) {
      console.warn(
        `Invalid timestamp format: ${eventRow.timestamp}. Skipping row.`,
      );
      continue;
    }

    if (!eventRow.transactionId) {
      console.warn('Skipping event with no transaction ID');
      continue;
    }
    event.transactionId = eventRow.transactionId;

    if (eventRow.eventSource) {
      const eventSourceEnumValue: number | undefined =
        EventSource[eventRow.eventSource as keyof typeof EventSource];
      if (eventSourceEnumValue === undefined) {
        console.warn(
          `Skipping event with invalid event_source: ${eventRow.eventSource}`,
        );
        continue;
      }
      event.eventSource = eventSourceEnumValue;
    }

    if (eventRow.gclid) {
      event.adIdentifiers = {gclid: eventRow.gclid};
    }

    if (eventRow.currency) {
      event.currency = eventRow.currency;
    }

    if (eventRow.value) {
      event.conversionValue = eventRow.value;
    }

    const userData = UserData.create();
    // Adds a UserIdentifier for each valid email address for the eventRecord.
    if (eventRow.emails) {
      for (const email of eventRow.emails) {
        try {
          const processedEmail = formatter.processEmailAddress(
            email,
            Encoding.HEX,
          );
          userData.userIdentifiers.push(
            UserIdentifier.create({emailAddress: processedEmail}),
          );
        } catch (e) {
          console.warn(`Invalid email address: ${email}. Skipping.`);
        }
      }
    }

    // Adds a UserIdentifier for each valid phone number for the eventRecord.
    if (eventRow.phoneNumbers) {
      for (const phoneNumber of eventRow.phoneNumbers) {
        try {
          const processedPhone = formatter.processPhoneNumber(
            phoneNumber,
            Encoding.HEX,
          );
          userData.userIdentifiers.push(
            UserIdentifier.create({phoneNumber: processedPhone}),
          );
        } catch (e) {
          console.warn(`Invalid phone: ${phoneNumber}. Skipping.`);
        }
      }
    }

    if (userData.userIdentifiers.length > 0) {
      event.userData = userData;
    }

    events.push(event);
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
    productDestinationId: argv.conversion_action_id,
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
  // Batches requests to send up to the maximum number of events per request.
  for (let i = 0; i < events.length; i += MAX_EVENTS_PER_REQUEST) {
    requestCount++;
    const eventsBatch = events.slice(i, i + MAX_EVENTS_PER_REQUEST);

    // Builds the request.
    const request = IngestEventsRequest.create({
      destinations: [destination],
      // Adds events from the current batch.
      events: eventsBatch,
      consent: Consent.create({
        adUserData: ConsentStatus.CONSENT_GRANTED,
        adPersonalization: ConsentStatus.CONSENT_GRANTED,
      }),
      // Sets encoding to match the encoding used.
      encoding: DataManagerEncoding.HEX,
      // Sets validate_only. If true, then the Data Manager API only validates the request
      validateOnly: argv.validate_only,
    });

    const [response] = await client.ingestEvents(request);
    console.log(`Response for request #${requestCount}:\n`, response);
  }
  console.log(`# of requests sent: ${requestCount}`);
}

/**
 * Reads the event data from the given JSON file.
 * @param {string} jsonFile The path to the JSON file.
 * @return {EventRow[]} An array of event data.
 */
function readEventDataFile(jsonFile: string): EventRow[] {
  const fileContent = fs.readFileSync(jsonFile, 'utf8');
  return JSON.parse(fileContent);
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
