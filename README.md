# Data Manager API utility library and samples for Node.js

Utility library and code samples for working with the
[Data Manager API](https://developers.google.com/data-manager/api) and Node.js.

## Setup instructions

https://developers.google.com/data-manager/api/get-started/set-up-access#node

## Repository structure

- [`data-manager-util`](data-manager-util): Source code for the utility library.

  Follow the setup instructions to declare a dependency on the current version
  of the utility library in your project. Use the utilities in the library to
  help with common tasks like formatting, hashing, encrypting, and encoding
  data for Data Manager API requests.

- [`data-manager-samples`](data-manager-samples): Code samples for working with
  the Data Manager API and the utility library.

  This project demonstrates how to set up a project that
  depends on the Data Manager API client library and the `data-manager-util`
  library.

## Run samples

To run a sample, invoke the script using the command line. You can pass
arguments to the script in one of two ways:

### 1.  Explicitly, on the command line

```shell
npm run ingest-events -w samples \
  --operating_account_type=<operating_account_type> \
  --operating_account_id=<operating_account_id> \
  --conversion_action_id=<conversion_action_id> \
  --json_file='</path/to/your/file>'
```

### 2.  Using an arguments file

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
