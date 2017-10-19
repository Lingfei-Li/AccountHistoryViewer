'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');
const hash = require('object-hash');

const TRANSACTIONS_TABLE = process.env.ACCOUNT_TRANSACTIONS_TABLE_NAME;
const LAST_TRANSACTION_DATE_TABLE = process.env.LAST_TRANSACTION_DATE_TABLE;

AWS.config.setPromisesDependency(require('bluebird'));

const dynamodb = new AWS.DynamoDB.DocumentClient();

/*
* 1. Read transaction data from Kinesis stream
* 2. Check against the last transaction date and filter out outdated transactions
* 3. Get the last transaction date from the records and update the last transaction date in Dynamo, if any
* 4. Put the transaction to Dynamo
* */
exports.processTransactionDataStream = (event, context, callback) => {
    let records = {};
    event.Records.forEach((record) => {
        // Kinesis data is base64 encoded so decode here
        const payloadStr = new Buffer(record.kinesis.data, 'base64').toString('ascii');
        const payload = JSON.parse(payloadStr);
        if(!records[payload.Bankname]) {
            records[payload.BankName] = [];
        }
        records[payload.BankName].push(payload);
    });
    for(let bankName in records) {
        let transactions = records[bankName];

        transactions.sort(function(a, b) {
            return a.TransactionDateSec < b.TransactionDateSec;
        });

        let lastTransactionParams = {
            TableName: LAST_TRANSACTION_DATE_TABLE,
            KeyConditionExpression: "BankName = :bankName",
            ExpressionAttributeValues: {
                ":bankName": bankName
            },
            ScanIndexForward: false
        };
        dynamodb.query(lastTransactionParams).promise().then(function(data) {
            let filteredTransactions;
            if(data.Items.length === 0) {
                console.log(`Last transaction date for bank ${bankName} is not present yet`);
                filteredTransactions = transactions;
            }
            else {
                let lastTransactionDateSec = data.Items[0].TransactionDateSec;
                let recordedTransactionsHash = data.Items[0].RecordedTransactionSHA1;
                filteredTransactions = transactions.filter(function(item) {
                    return item.TransactionDateSec >= lastTransactionDateSec && !recordedTransactionsHash.includes(hash(item));
                });
            }

            //TODO: Put the last transaction date to LastTransactionDate table

            //TODO: Put the filtered transactions to AccountTransactions table

        }).catch(function(err) {
            console.error("Failed to query last transaction date for bank: ", bankName);
            console.error(err);
        });
    }

    // dynamodb.put(params).promise().then(function(data) {
    //     console.log("Data successfully put in table: ");
    //     console.log(JSON.stringify(data, null, 2));
    // }).catch(function(err) {
    //     console.error("Failed to put the data: ");
    //     console.error(JSON.stringify(params.Item, null, 2));
    //     console.error("error:\n", err);
    // });

    callback(null, `Successfully processed ${event.Records.length} records.`);
};

exports.list = (event, context, callback) => {
    console.log("account transactions table name: ", TRANSACTIONS_TABLE);
    const params = {
        TableName: TRANSACTIONS_TABLE,
        ProjectionExpression: 'TransactionDateSec, #_UUID, UserId, AccountType, Amount, BankName, CreateDateSec, Description, TransactionType',
        ExpressionAttributeNames: {
            '#_UUID': 'UUID',
        },
    };
    dynamodb.scan(params).promise().then(function(data) {
        const response = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                transactions: data.Items
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
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                message: "Path parameters missing or they cannot be converted to integer"
            }),
        };
        return callback(null, response);
    }

    const params = {
        TableName: TRANSACTIONS_TABLE,
        ProjectionExpression: 'TransactionDateSec, #_UUID, UserId, AccountType, Amount, BankName, CreateDateSec, Description, TransactionType',
        ExpressionAttributeNames: {
            '#_UUID': 'UUID',
        },
        FilterExpression: "TransactionDateSec between :startDateSec and :endDateSec",
        ExpressionAttributeValues: {
            ':startDateSec': startDateSec,
            ':endDateSec': endDateSec,
        }
    };
    dynamodb.scan(params, onScan).promise().then(function(data) {
        const response = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                transactions: data.Items
            }),
        };
        return callback(null, response);
    }).then(function(err) {
        const response = {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                error: err
            }),
        };
        return callback(null, response);
    });
};
function internalErrorResponse(err) {
    return {
        statusCode: 500,
        headers: {
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
            error: err
        }),
    };
}


