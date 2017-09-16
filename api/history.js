'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');
const BloomFilter = require('bloom-filter');

const BALANCE_TABLE = "account-daily-balance";
const HISTORY_TABLE = "account-history-service";

const defaultDailyTransactionAmount = 30;
const defaultFalsePositiveRate = 0.001;

AWS.config.setPromisesDependency(require('bluebird'));

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.list = (event, context, callback) => {
    const params = {
        TableName: HISTORY_TABLE,
        ProjectionExpression: 'id, bank, #acct, #typ, amount, description, transaction_date_sec, create_date_sec',
        ExpressionAttributeNames: {
            '#typ': 'type',
            '#acct': 'account'
        }
    };
    dynamodb.scan(params).promise().then(function(data) {
        const response = {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                history: data.Items
            }),
        };
        return callback(null, response);
    }).catch(function(err) {
        return callback(null, internalErrorResponse(err));
    });
};

exports.listBetweenDates = (event, context, callback) => {
    console.log(event);
    let startDateSec = parseInt(event.pathParameters.startDateSecStr);
    let endDateSec = parseInt(event.pathParameters.endDateSecStr);
    if(endDateSec <= startDateSec) {
        endDateSec = moment().unix();
    }
    if(isNaN(startDateSec) || isNaN(endDateSec)) {
        const response = {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: "Path parameters missing or they cannot be converted to integer"
            }),
        };
        return callback(null, response);
    }

    const params = {
        TableName: HISTORY_TABLE,
        ProjectionExpression: 'id, bank, #acct, #typ, amount, description, transaction_date_sec, create_date_sec',
        FilterExpression: "transaction_date_sec between :start_date_sec and :end_date_sec",
        ExpressionAttributeNames: {
            '#typ': 'type',
            '#acct': 'account'
        },
        ExpressionAttributeValues: {
            ':start_date_sec': startDateSec,
            ':end_date_sec': endDateSec,
        }
    };
    dynamodb.scan(params, onScan).promise().then(function(data) {
        const response = {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                history: data.Items
            }),
        };
        return callback(null, response);
    }).then(function(err) {
        const response = {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: err
            }),
        };
        return callback(null, response);
    });
};

exports.calculateDailyBalance = (event, context, callback) => {
    event.Records.forEach((record) => {
        console.log('Stream record: ', JSON.stringify(record, null, 2));
        if (record.eventName === 'INSERT') {
            let amount = record.dynamodb.NewImage.amount.N;
            let transaction_date_sec = parseInt(record.dynamodb.NewImage.transaction_date_sec.N);
            let params = {
                TableName: BALANCE_TABLE,
                ProjectionExpression: 'date_sec, sequence_number, bloom_filter, balance',
                KeyConditionExpression: 'date_sec = :transaction_date_sec',
                ExpressionAttributeValues: {
                    ":transaction_date_sec": transaction_date_sec
                },
                Limit: 1,
                ScanIndexForward: false
            };
            console.log("Start query");
            dynamodb.query(params).promise().then(function(data) {
                if(data.Items.length === 0) {
                    let bloom_filter = BloomFilter.create(defaultDailyTransactionAmount, defaultFalsePositiveRate);
                    bloom_filter.insert(transaction_date_sec);
                    let params = {
                        TableName: BALANCE_TABLE,
                        Item: {
                            date_sec: transaction_date_sec,
                            version: 1,
                            amount: amount,
                            bloom_filter: JSON.stringify(bloom_filter.toObject())
                        }
                    };
                    dynamodb.put(params).promise().then(function(data) {
                        console.log("Data successfully put in table");
                        console.log(JSON.stringify(data, null, 2));
                    }).catch(function(err) {
                        console.error("Failed to put the data: ");
                        console.error(JSON.stringify(params.Item, null, 2));
                        console.error("error:\n", err);
                    });
                }
                else {
                    if(data.Items.length !== 1) {
                        console.error("Daily balance retrieved from DynamoDB has more than 1 value");
                    }
                    let balance_data = data.Items[0];
                    let version = balance_data.version;
                    let balance_amount = balance_data.amount;
                    let bloom_filter_str = balance_data.bloom_filter;
                    let bloom_filter = BloomFilter(JSON.parse(bloom_filter_str));
                    if(bloom_filter.contains(transaction_date_sec)) {
                        console.warn("Bloom Filter already contains the transaction: ");
                        console.warn(params.Item);
                        return;
                    }
                    bloom_filter.insert(transaction_date_sec);
                    let params = {
                        TableName: BALANCE_TABLE,
                        Item: {
                            date_sec: transaction_date_sec,
                            version: version + 1,
                            amount: balance_amount + amount,
                            bloom_filter: JSON.stringify(bloom_filter.toObject())
                        }
                    };
                    dynamodb.put(params).promise().then(function(data) {
                        console.log("Data successfully put in table: ");
                        console.log(JSON.stringify(data, null, 2));
                    }).catch(function(err) {
                        console.error("Failed to put the data: ");
                        console.error(JSON.stringify(params.Item, null, 2));
                        console.error("error:\n", err);
                    });
                }
            }).catch(function(err) {
                console.error("Got an error querying daily balance");
                console.error(err);
            });
        }
    });
};

function internalErrorResponse(err) {
    return {
        statusCode: 500,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            error: err
        }),
    };
}


const submitHistoryPromise = history => {
    console.log('adding history');
    const historyData = {
        TableName: HISTORY_TABLE,
        Item: history
    };
    return dynamodb.put(historyData).promise().then(res => historyData);
};
