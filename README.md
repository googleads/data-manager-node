# Data Manager API utility library and samples for Node.js

[![npm version](https://img.shields.io/npm/v/@google-ads/datamanager-util.svg)](https://www.npmjs.com/package/@google-ads/datamanager-util)

Utility library and code samples for working with the
[Data Manager API](https://developers.google.com/data-manager/api) and Node.js.

## Requirements

- Node.js 22+

## Setup instructions

The `@google-ads/datamanager-util` utility library is published to
[npm](https://www.npmjs.com/package/@google-ads/datamanager-util). Install it
using `npm`:

```shell
npm install @google-ads/datamanager-util
```

For complete instructions on setting up API access and installing the client and
utility libraries, see the
[Set up API access](https://developers.google.com/data-manager/api/devguides/quickstart/set-up-access)
and
[Install a client library](https://developers.google.com/data-manager/api/devguides/quickstart/install-library#node.js)
guides.

## Repository structure

- [`util`](util): Source code and tests for the `@google-ads/datamanager-util`
  npm package. Use the utilities in the library to help with common tasks like
  formatting, hashing, and encoding data for Data Manager API requests.

- [`samples`](samples): Code samples demonstrating how to construct and send
  requests to the Data Manager API using the
  [`@google-ads/datamanager`](https://www.npmjs.com/package/@google-ads/datamanager)
  client library and the `@google-ads/datamanager-util` utility library.

## Run samples

To run a sample, invoke the script using the command line. You can pass
arguments to the script in one of two ways:

### 1. Explicitly, on the command line

```shell
npm run ingest-events -w samples \
  --operating_account_type=<operating_account_type> \
  --operating_account_id=<operating_account_id> \
  --conversion_action_id=<conversion_action_id> \
  --json_file='</path/to/your/file>'
```

### 2. Using an arguments file

You can also save arguments in a file.

**Note:** The arguments filename must end in `.json`.

```
{
  "operating_account_type": "YOUR_OPERATING_ACCOUNT_TYPE",
  "operating_account_id": "YOUR_OPERATING_ACCOUNT_ID",
  "conversion_action_id": "YOUR_CONVERSION_ACTION_ID",
  "json_file": "samples/sampledata/events_1.json"
}
```

Then, run the sample with the `--config` argument:

```shell
npm run ingest-events -w samples --config /path/to/your/argsjsonfile
```

## Issue tracker

- https://github.com/googleads/data-manager-node/issues

## Contributing

Contributions welcome! See the [Contributing Guide](CONTRIBUTING.md).

## Authors

- [Josh Radcliff](https://github.com/jradcliff)
- [Lindsey Volta](https://github.com/lindsey-volta)
