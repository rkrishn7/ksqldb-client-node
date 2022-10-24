# ksqldb-client-node

![CI](https://github.com/rkrishn7/ksqldb-client-node/actions/workflows/ci.yml/badge.svg) [![Coverage Status](https://coveralls.io/repos/github/rkrishn7/ksqldb-client-node/badge.svg)](https://coveralls.io/github/rkrishn7/ksqldb-client-node) [![npm version](https://badge.fury.io/js/ksqldb-client-node.svg)](https://badge.fury.io/js/ksqldb-client-node) [![install size](https://packagephobia.com/badge?p=ksqldb-client-node)](https://packagephobia.com/result?p=ksqldb-client-node) [![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

A [ksqlDB](https://ksqldb.io/) client for NodeJS

## Table of Contents <!-- omit in toc -->
- [ksqldb-client-node](#ksqldb-client-node)
  - [Installation](#installation)
  - [Usage](#usage)

## Installation

```bash
$ yarn add ksqldb-client-node
```

## Usage

```ts
import { KsqlDbClient } from 'ksqldb-client-node';

// Create the client
const client = new KsqlDbClient({
  url: 'http://localhost:8088',
});

// Create a new session to enable communication with the server's HTTP/2 endpoints
const session = client.session();

// Create a new query stream and subscribe to the updates
const queryStream = session.queryStream<QueryResult>({
  sql: 'SELECT * FROM STREAM EMIT CHANGES;',
});

for (await resultSet of queryStream) {
  // do work...
}

// Destroy the session handle
session.close();
```
