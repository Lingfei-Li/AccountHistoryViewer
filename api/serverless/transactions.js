'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');
const hash = require('object-hash');

const TRANSACTIONS_TABLE = process.env.ACCOUNT_TRANSACTIONS_TABLE_NAME;
const LAST_TRANSACTION_DATE_TABLE = process.env.LAST_TRANSACTION_DATE_TABLE;

const dynamodb = new AWS.DynamoDB.DocumentClient();

const CORS_HEADERS = {
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
    "Access-Control-Allow-Origin": "*"
};

/*
* 1. Read transaction data from Kinesis stream
* 2. Check against the last transaction date and filter out outdated transactions
* 3. Get the last transaction date from the records and update the last transaction date in Dynamo, if any
* 4. Put the transaction to Dynamo
* */
exports.processTransactionDataStream = (event, context, callback) => {
    let records = {};
    console.log("Records:", event.Records);
    event.Records.forEach((record) => {
        // Kinesis data is base64 encoded so decode here
        const payloadStr = new Buffer(record.kinesis.data, 'base64').toString('ascii');
        const payload = JSON.parse(payloadStr);
        if(!records.hasOwnProperty(payload.BankName)) {
            records[payload.BankName] = [];
        }
        records[payload.BankName].push(payload);
    });
    for(let bankName in records) {
        let transactions = records[bankName];

        let lastTransactionQueryParams = {
            TableName: LAST_TRANSACTION_DATE_TABLE,
            KeyConditionExpression: "BankName = :bankName",
            ExpressionAttributeValues: {
                ":bankName": bankName
            }
        };
        dynamodb.query(lastTransactionQueryParams, function(err, data) {
            if(err) {
                console.error("Failed to query last transaction date for bank: ", bankName);
                console.error(err);
                return callback(internalErrorResponse(err));
            } else {
                let filteredTransactions;
                if(data.Items.length === 0) {
                    console.log(`Last transaction date for bank ${bankName} is not present yet`);
                    filteredTransactions = transactions;
                } else {
                    let lastTransactionDateSec = data.Items[0].TransactionDateSec;
                    let recordedTransactionsHash = data.Items[0].RecordedTransactionsSHA1;
                    console.log(`Last transaction date for bank ${bankName} is `, lastTransactionDateSec);

                    filteredTransactions = transactions.filter(function(item) {
                        return item.TransactionDateSec >= lastTransactionDateSec && !recordedTransactionsHash.includes(hash(item));
                    });
                }

                if(filteredTransactions.length === 0) {
                    console.log("All transactions have already been recorded");
                    return callback(null, successResponse("All transactions have already been recorded"));
                }
                else {
                    console.log("Filtered transactions number:" + filteredTransactions.length);

                    let lastTransactionDateSec = filteredTransactions.reduce(function(result, currValue) {
                        return Math.max(result, currValue.TransactionDateSec);
                    }, 0);
                    console.log("Last transaction date for this batch:", lastTransactionDateSec);

                    let recordedTransactionsHash = [];
                    if(data.Items.length === 0 || lastTransactionDateSec > data.Items[0].TransactionDateSec) {
                        // If there's no last transaction date for the current bank, or the new transaction date is larger,
                        // we will update the last transaction date
                        filteredTransactions.forEach(function(item) {
                            recordedTransactionsHash.push(hash(item));
                        });
                    } else if(lastTransactionDateSec === data.Items[0].TransactionDateSec) {
                        //Update the existing value. Specifically, update RecordedTransactionsSHA1
                        if(data.Items[0].RecordedTransactionsSHA1) {
                            recordedTransactionsHash = data.Items[0].RecordedTransactionsSHA1;
                        }
                        filteredTransactions.forEach(function(item) {
                            recordedTransactionsHash.push(hash(item));
                        });
                    }

                    // Put the filtered transactions to AccountTransactions table
                    let batchWriteRequestArray = [];
                    filteredTransactions.forEach(function(item) {
                        batchWriteRequestArray.push({
                            PutRequest: {
                                Item: item
                            }
                        })
                    });

                    console.log("Put transactions to table in groups of 10");
                    for(let i = 0; i < batchWriteRequestArray.length; i += 10) {
                        let transactionsBatchWriteParams = {'RequestItems': {}};
                        transactionsBatchWriteParams['RequestItems'][TRANSACTIONS_TABLE] = batchWriteRequestArray.slice(i, Math.min(i+10, batchWriteRequestArray.length-1));
                        dynamodb.batchWrite(transactionsBatchWriteParams, function(err, data) {
                            if(err) {
                                console.error("Failed to batch write transaction data");
                                console.error(err);
                                return callback(internalErrorResponse(err));
                            } else {
                                console.log("Successfully put transactions to DynamoDB");
                            }
                        });
                    }

                    console.log("Update last transaction date for the bank");
                    let lastTransactionPutParams = {
                        TableName: LAST_TRANSACTION_DATE_TABLE,
                        Item: {
                            "BankName": bankName,
                            "TransactionDateSec": lastTransactionDateSec,
                            "RecordedTransactionsSHA1": recordedTransactionsHash
                        }
                    };

                    console.log("DynamoDB last transaction date params:", lastTransactionPutParams);
                    dynamodb.put(lastTransactionPutParams, function(err, data) {
                        if(err) {
                            console.error("Failed to write last transaction date data");
                            console.error(err);
                            return callback(internalErrorResponse(err));
                        } else {
                            console.log("Successfully put last transaction date");

                            return callback(null, successResponse("Successfully put transactions to DynamoDB"));
                        }
                    });
                }
            }
        });
    }
    callback(null, `Successfully processed ${event.Records.length} records.`);
};

exports.getAll = (event, context, callback) => {
    console.log("account transactions table name: ", TRANSACTIONS_TABLE);
    const params = {
        TableName: TRANSACTIONS_TABLE,
        ProjectionExpression: 'TransactionDateSec, #_UUID, UserId, AccountType, Amount, BankName, Description, TransactionType',
        ExpressionAttributeNames: {
            '#_UUID': 'UUID',
        },
    };
    dynamodb.scan(params, function(err, data) {
        if(err) {
            callback(internalErrorResponse(err));
        } else {
            callback(null, successResponseWithTransactions(data.Items));
        }
    });
};

exports.getBetweenDates = (event, context, callback) => {
    console.log(event);
    let startDateSec = parseInt(event.pathParameters.startDateSec);
    let endDateSec = parseInt(event.pathParameters.endDateSec);
    if(endDateSec <= startDateSec) {
        endDateSec = moment().unix();
    }
    if(isNaN(startDateSec) || isNaN(endDateSec)) {
        callback(clientErrorResponse("Path parameters missing or they cannot be converted to integer"));
        return;
    }

    const params = {
        TableName: TRANSACTIONS_TABLE,
        ProjectionExpression: 'TransactionDateSec, #_UUID, UserId, AccountType, Amount, BankName, Description, TransactionType',
        ExpressionAttributeNames: {
            '#_UUID': 'UUID',
        },
        FilterExpression: "TransactionDateSec between :startDateSec and :endDateSec",
        ExpressionAttributeValues: {
            ':startDateSec': startDateSec,
            ':endDateSec': endDateSec,
        }
    };
    dynamodb.scan(params, function(err, data) {
        if(err) {
            callback(internalErrorResponse(err));
        } else {
            callback(null, successResponseWithTransactions(data.Items));
        }
    });
};

function clientErrorResponse(err) {
    return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            error: err
        }),
    };
}

function internalErrorResponse(err) {
    return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            error: err
        }),
    };
}


function successResponse(msg) {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            message: msg
        })
    };
}

function successResponseWithTransactions(transactions) {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            transactions: transactions
        })
    };
}


