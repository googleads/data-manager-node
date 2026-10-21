#!/usr/bin/env node
// Copyright 2026 Google LLC
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

import {UserListServiceClient, protos} from '@google-ads/datamanager';
const {
  ContactIdInfo,
  CreateUserListRequest,
  DataSourceType,
  IngestedUserListInfo,
  MobileIdInfo,
  ProductAccount,
  UserIdInfo,
  UserList,
} = protos.google.ads.datamanager.v1;
const {CONTACT_ID, USER_ID, MOBILE_ID} = IngestedUserListInfo.UploadKeyType;
const {Duration} = protos.google.protobuf;
import * as yargs from 'yargs';

interface Arguments {
  operating_account_type: string;
  operating_account_id: string;
  upload_key_type: string;
  validate_only: boolean;
  login_account_type?: string;
  login_account_id?: string;
  linked_account_type?: string;
  linked_account_id?: string;
  key_space?: string;
  app_id?: string;
  [x: string]: unknown;
}

// [START create-user-list]
/**
 * Runs the CreateUserList sample.
 * @param {string} operatingAccountType The account type of the operating account.
 * @param {string} operatingAccountId The ID of the operating account.
 * @param {boolean} validateOnly Whether to enable validate_only on the request.
 * @param {protos.google.ads.datamanager.v1.IngestedUserListInfo.UploadKeyType} uploadKeyType The upload key type of the user list.
 * @param {string} [loginAccountType] The account type of the login account.
 * @param {string} [loginAccountId] The ID of the login account.
 * @param {string} [linkedAccountType] The account type of the linked account.
 * @param {string} [linkedAccountId] The ID of the linked account.
 * @param {protos.google.ads.datamanager.v1.MobileIdInfo.KeySpace} [keySpace] The key space of mobile IDs. Required when uploadKeyType is MOBILE_ID.
 * @param {string} [appId] The mobile application ID. Required when uploadKeyType is MOBILE_ID.
 */
async function runSample(
  operatingAccountType: string,
  operatingAccountId: string,
  validateOnly: boolean,
  uploadKeyType: protos.google.ads.datamanager.v1.IngestedUserListInfo.UploadKeyType = CONTACT_ID,
  loginAccountType?: string,
  loginAccountId?: string,
  linkedAccountType?: string,
  linkedAccountId?: string,
  keySpace?: protos.google.ads.datamanager.v1.MobileIdInfo.KeySpace,
  appId?: string,
) {
  // Creates a client for UserListService.
  const userListClient = new UserListServiceClient();

  // Optional: Sets headers to specify the login-account and linked-account if
  // your credentials aren't for a user in the operating account (for example,
  // when authenticating through a Google Ads manager account or Data Partner
  // account).
  const headers: {[key: string]: string} = {};

  if (loginAccountType && loginAccountId) {
    headers['login-account'] = userListClient.accountPath(
      loginAccountType,
      loginAccountId,
    );
  }

  if (linkedAccountType && linkedAccountId) {
    headers['linked-account'] = userListClient.accountPath(
      linkedAccountType,
      linkedAccountId,
    );
  }

  // Configures the Customer Match user list.
  // For more details on constructing a UserList, see:
  // https://developers.google.com/data-manager/api/devguides/audiences/google-ads/customer-match/create-audience
  const ingestedUserListInfo = IngestedUserListInfo.create({
    // Sets to a list containing a single UploadKeyType.
    uploadKeyTypes: [uploadKeyType],
  });

  switch (uploadKeyType) {
    case CONTACT_ID:
      // Use CONTACT_ID for hashed email addresses, phone numbers, or physical
      // addresses.
      ingestedUserListInfo.contactIdInfo = ContactIdInfo.create({
        dataSourceType: DataSourceType.DATA_SOURCE_TYPE_FIRST_PARTY,
      });
      break;
    case USER_ID:
      // Use USER_ID for first-party user IDs assigned to logged-in users.
      // Note: Display & Video 360 does not support USER_ID lists.
      ingestedUserListInfo.userIdInfo = UserIdInfo.create({
        dataSourceType: DataSourceType.DATA_SOURCE_TYPE_FIRST_PARTY,
      });
      break;
    case MOBILE_ID:
      // Use MOBILE_ID for mobile advertising IDs.
      ingestedUserListInfo.mobileIdInfo = MobileIdInfo.create({
        dataSourceType: DataSourceType.DATA_SOURCE_TYPE_FIRST_PARTY,
        keySpace,
        appId,
      });
      break;
    default:
      throw new Error(`Unsupported upload key type: ${uploadKeyType}`);
  }

  const uploadKeyTypeName = Object.keys(
    IngestedUserListInfo.UploadKeyType,
  ).find(
    key =>
      IngestedUserListInfo.UploadKeyType[
        key as keyof typeof IngestedUserListInfo.UploadKeyType
      ] === uploadKeyType,
  );
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const userList = UserList.create({
    // Required. The display name must be unique among all lists owned by the
    // account.
    displayName: `Customer Match (${uploadKeyTypeName}) - ${timestamp}`,
    description: `Customer Match audience for ${uploadKeyTypeName}`,
    // Optional. The duration an audience member remains in the list after
    // being added. Must correspond to whole days (defaults to maximum if
    // not set).
    membershipDuration: Duration.create({
      seconds: 30 * 24 * 60 * 60,
    }),
    // Required for a Customer Match audience.
    ingestedUserListInfo,
  });

  // Builds the request targeting the parent operating account.
  const request = CreateUserListRequest.create({
    parent: userListClient.accountPath(
      operatingAccountType,
      operatingAccountId,
    ),
    userList,
    // Sets validate_only. If true, then the Data Manager API only
    // validates the request but doesn't apply changes.
    validateOnly,
  });

  // Sends the request with any configured header metadata.
  const [response] = await userListClient.createUserList(request, {
    otherArgs: {headers},
  });

  // Logs the created user list. When validate_only is false, response.id
  // contains the created user list ID, which you pass as the
  // product_destination_id in subsequent ingest or remove requests.
  console.log('Response:\n', response);
}
// [END create-user-list]

/**
 * The main function for the CreateUserList sample.
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
    .option('upload_key_type', {
      describe:
        "The upload key type of the user list. Defaults to 'CONTACT_ID'.",
      type: 'string',
      choices: ['CONTACT_ID', 'USER_ID', 'MOBILE_ID'],
      default: 'CONTACT_ID',
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
    .option('key_space', {
      describe:
        "The key space of mobile IDs ('ANDROID' or 'IOS'). Required when " +
        "--upload_key_type is 'MOBILE_ID'.",
      type: 'string',
      choices: ['ANDROID', 'IOS'],
    })
    .option('app_id', {
      describe:
        'A string that uniquely identifies a mobile application from ' +
        "which the data was collected (for example, 'com.labpixies.flood' for " +
        "Android or '476943146' for iOS). Required when --upload_key_type is " +
        "'MOBILE_ID'.",
      type: 'string',
    })
    .option('validate_only', {
      describe: 'Whether to enable validate_only on the request.',
      type: 'boolean',
      default: true,
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
      if (args.upload_key_type === 'MOBILE_ID') {
        if (!args.key_space || !args.app_id) {
          throw new Error(
            'Must specify both key_space and app_id when upload_key_type is ' +
              'MOBILE_ID',
          );
        }
      } else if (args.key_space || args.app_id) {
        throw new Error(
          'key_space and app_id are only supported when upload_key_type is ' +
            'MOBILE_ID',
        );
      }
      return true;
    })
    .parseSync();

  validateAccountType(argv.operating_account_type, 'operating_account_type');
  if (argv.login_account_type) {
    validateAccountType(argv.login_account_type, 'login_account_type');
  }
  if (argv.linked_account_type) {
    validateAccountType(argv.linked_account_type, 'linked_account_type');
  }

  const uploadKeyType =
    IngestedUserListInfo.UploadKeyType[
      argv.upload_key_type as keyof typeof IngestedUserListInfo.UploadKeyType
    ];
  const keySpace = argv.key_space
    ? MobileIdInfo.KeySpace[
        argv.key_space as keyof typeof MobileIdInfo.KeySpace
      ]
    : undefined;

  await runSample(
    argv.operating_account_type,
    argv.operating_account_id,
    argv.validate_only,
    uploadKeyType,
    argv.login_account_type,
    argv.login_account_id,
    argv.linked_account_type,
    argv.linked_account_id,
    keySpace,
    argv.app_id,
  );
}

/**
 * Validates that a given string is an enum value for the AccountType enum.
 * @param {string} proposedValue The name of an AccountType enum value.
 * @param {string} paramName The name of the parameter to use in the error message if validation fails.
 * @throws {Error} If the string is not an AccountType enum value.
 */
function validateAccountType(proposedValue: string, paramName: string): void {
  const AccountType = ProductAccount.AccountType;
  const accountTypeEnumNames = Object.keys(AccountType).filter(key =>
    isNaN(Number(key)),
  );
  if (!accountTypeEnumNames.includes(proposedValue)) {
    throw new Error(`Invalid ${paramName}: ${proposedValue}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
