'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');

const DAILY_BALANCE_TABLE = process.env.ACCOUNT_DAILY_BALANCE_TABLE;
const MONTHLY_BALANCE_TABLE = process.env.ACCOUNT_MONTHLY_BALANCE_TABLE;

AWS.config.setPromisesDependency(require('bluebird'));

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.updateDailyBalance = (event, context, callback) => {
    console.log("daily balance table:", DAILY_BALANCE_TABLE);
    console.log("monthly balance table:", MONTHLY_BALANCE_TABLE);
    console.log("updating daily balance:", event);
};

exports.updateDailyBalance_bak = (event, context, callback) => {
    event.Records.forEach((record) => {
        console.log('Stream record: ', JSON.stringify(record, null, 2));
        if (record.eventName === 'INSERT') {
            let amount = record.dynamodb.NewImage.amount.N;
            let transaction_date_sec = parseInt(record.dynamodb.NewImage.transaction_date_sec.N);
            let params = {
                TableName: BALANCE_TABLE,
                ProjectionExpression: 'date_sec, sequence_number, balance, transactionIds',
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
                    let params = {
                        TableName: BALANCE_TABLE,
                        Item: {
                            date_sec: transaction_date_sec,
                            version: 1,
                            amount: amount
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
                    let params = {
                        TableName: BALANCE_TABLE,
                        Item: {
                            date_sec: transaction_date_sec,
                            version: version + 1,
                            amount: balance_amount + amount
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
