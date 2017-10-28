'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');

const DAILY_BALANCE_TABLE = process.env.ACCOUNT_DAILY_BALANCE_TABLE;
const MONTHLY_BALANCE_TABLE = process.env.ACCOUNT_MONTHLY_BALANCE_TABLE;

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.updateDailyBalance = (event, context, callback) => {
    console.log("daily balance table:", DAILY_BALANCE_TABLE);
    console.log("monthly balance table:", MONTHLY_BALANCE_TABLE);
    console.log("updating daily balance:", event);

    event.Records.forEach((record) => {
        console.log('Stream record: ', JSON.stringify(record, null, 2));
        if (record.eventName === 'INSERT') {
            const transaction = record.dynamodb.NewImage;
            const id = transaction.UUID.S;
            const bankName = transaction.BankName.S;
            const transactionDateSec = parseInt(transaction.TransactionDateSec.N);
            const amount = parseFloat(transaction.Amount.N);
            let params = {
                TableName: DAILY_BALANCE_TABLE,
                ProjectionExpression: 'BankName, DateSec, Balance, RecordedTransactionsId',
                KeyConditionExpression: 'BankName = :bankName and DateSec = :transactionDateSec',
                ExpressionAttributeValues: {
                    ":bankName": bankName,
                    ":transactionDateSec": transactionDateSec
                }
            };
            console.log("Start query daily balance table for current data");
            dynamodb.query(params, function(err, data) {
                if(err) {
                    console.error("Got an error querying daily balance");
                    console.error(err);
                    callback(new Error(err));
                } else {
                    if(data.Items.length === 0) {
                        console.log("No daily balance data for this date yet. Initialize the balance data.");
                        let params = {
                            TableName: DAILY_BALANCE_TABLE,
                            Item: {
                                BankName: bankName,
                                DateSec: transactionDateSec,
                                Balance: amount,
                                RecordedTransactionsId: [id]
                            }
                        };
                        dynamodb.put(params, function(err, data) {
                            if(err) {
                                console.error("Failed to put the data: ");
                                console.error(JSON.stringify(params.Item, null, 2));
                                console.error("error:\n", err);
                                callback(new Error(err));
                            } else {
                                console.log("Data successfully put in daily balance table");
                            }
                        });
                    } else {
                        if(data.Items.length !== 1) {
                            callback(new Error("Daily balance retrieved from DynamoDB has more than 1 value"));
                        }
                        const dailyBalanceDataItem = data.Items[0];
                        const balance = parseFloat(dailyBalanceDataItem.Balance);
                        let recordedTransactionsId = dailyBalanceDataItem.RecordedTransactionsId;
                        recordedTransactionsId.push(id);
                        let params = {
                            TableName: DAILY_BALANCE_TABLE,
                            Item: {
                                BankName: bankName,
                                DateSec: transactionDateSec,
                                Balance: balance + amount,
                                RecordedTransactionsId: recordedTransactionsId
                            }
                        };
                        dynamodb.put(params, function(err, data) {
                            if(err) {
                                console.error("Failed to put the data: ");
                                console.error(JSON.stringify(params.Item, null, 2));
                                console.error("error:\n", err);
                                callback(new Error(err));
                            } else {
                                console.log("Data successfully update in daily balance table: ");
                                console.log(JSON.stringify(data, null, 2));
                            }
                        });
                    }
                }
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


