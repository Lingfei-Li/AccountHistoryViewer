'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');
const hash = require('object-hash');

const DAILY_BALANCE_TABLE = process.env.ACCOUNT_DAILY_BALANCE_TABLE;
const MONTHLY_BALANCE_TABLE = process.env.ACCOUNT_MONTHLY_BALANCE_TABLE;
const TRANSACTIONS_TABLE = process.env.ACCOUNT_TRANSACTIONS_TABLE_NAME;
const LAST_TRANSACTION_DATE_TABLE = process.env.LAST_TRANSACTION_DATE_TABLE;

const dynamodb = new AWS.DynamoDB.DocumentClient();

/*
 * 1. Read transaction data from Kinesis stream
 * 2. Check against the last transaction date and filter out outdated transactions
 * 3. Get the last transaction date from the records and update the last transaction date in Dynamo, if any
 * 4. Put the transaction to Dynamo
 * */
exports.processTransactionData = (event, context, callback) => {
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

exports.updateDailyBalance = (event, context, callback) => {
    console.log("Updating daily balance. Record count: " + event.Records.length);

    let tempDailyBalance = {};
    let tempTransactionIds = {};
    event.Records.forEach((record) => {
        if (record.eventName === 'INSERT') {
            const transaction = record.dynamodb.NewImage;
            const id = transaction.UUID.S;
            const bankName = transaction.BankName.S;
            const transactionDateSec = parseInt(transaction.TransactionDateSec.N);
            const amount = parseFloat(transaction.Amount.N);

            if (!tempDailyBalance.hasOwnProperty(transactionDateSec)) {
                tempDailyBalance[transactionDateSec] = {};
                tempTransactionIds[transactionDateSec] = {};
            }
            if (!tempDailyBalance[transactionDateSec].hasOwnProperty(bankName)) {
                tempDailyBalance[transactionDateSec][bankName] = 0;
                tempTransactionIds[transactionDateSec][bankName] = [];
            }
            tempDailyBalance[transactionDateSec][bankName] += amount;
            tempTransactionIds[transactionDateSec][bankName].push(id);
        }
    });

    for(const dateSecStr in tempDailyBalance) if(tempDailyBalance.hasOwnProperty(dateSecStr) && tempDailyBalance[dateSecStr]) {
        const dateSec = parseInt(dateSecStr);
        for(const bankName in tempDailyBalance[dateSecStr]) if(tempDailyBalance[dateSecStr].hasOwnProperty(bankName) && tempDailyBalance[dateSecStr][bankName]) {
            console.log(typeof dateSecStr);
            console.log('dateSecStr', dateSecStr, 'dateSec', dateSec, 'bankName', bankName);
            const queryParams = {
                TableName: DAILY_BALANCE_TABLE,
                ProjectionExpression: 'BankName, DateSec, Balance, RecordedTransactionsId',
                KeyConditionExpression: 'BankName = :bankName and DateSec = :dateSec',
                ExpressionAttributeValues: {
                    ":bankName": bankName,
                    ":dateSec": dateSec
                }
            };
            console.log("Start query daily balance table for current data");
            dynamodb.query(queryParams, function(err, data) {
                if(err) {
                    console.error("Got an error querying daily balance with params:");
                    console.error(JSON.stringify(queryParams, null, 2));
                    callback(new Error(err));
                } else {
                    if(data.Items.length === 0) {
                        console.log("No daily balance data for this date yet. Initialize the balance data.");
                        const putParams = {
                            TableName: DAILY_BALANCE_TABLE,
                            Item: {
                                BankName: bankName,
                                DateSec: dateSec,
                                Balance: tempDailyBalance[dateSecStr][bankName],
                                RecordedTransactionsId: tempTransactionIds[dateSecStr][bankName]
                            }
                        };
                        dynamodb.put(putParams, function(err, data) {
                            if(err) {
                                console.error("Failed to put the balance data: ");
                                console.error(JSON.stringify(putParams, null, 2));
                                callback(new Error(err));
                            } else {
                                console.log("Data successfully put in daily balance table");
                            }
                        });
                    } else {
                        if(data.Items.length !== 1) {
                            console.error("data.Items has more than 1 records:");
                            console.error(JSON.stringify(data.Items, null, 2));
                            callback(new Error("Daily balance retrieved from DynamoDB has more than 1 value"));
                        }
                        const dailyBalanceDataItem = data.Items[0];
                        const balance = parseFloat(dailyBalanceDataItem.Balance);
                        let recordedTransactionsId = dailyBalanceDataItem.RecordedTransactionsId;
                        const putParams = {
                            TableName: DAILY_BALANCE_TABLE,
                            Item: {
                                BankName: bankName,
                                DateSec: dateSec,
                                Balance: balance + tempDailyBalance[dateSecStr][bankName],
                                RecordedTransactionsId: recordedTransactionsId.concat(tempTransactionIds[dateSecStr][bankName])
                            }
                        };
                        dynamodb.put(putParams, function(err, data) {
                            if(err) {
                                console.error("Failed to put the data: ");
                                console.error(JSON.stringify(putParams, null, 2));
                                callback(new Error(err));
                            } else {
                                console.log("Data successfully update in daily balance table");
                            }
                        });
                    }
                }
            });
        }
    }
};


exports.updateMonthlyBalance = (event, context, callback) => {
    console.log("Updating monthly balance. Count: ", event.Records.length);

    let tempMonthlyBalance = {};     // Only used when no data exists for the current yearMonth+bankname
    let tempDailyBalanceMapping = {};
    event.Records.forEach((record) => {
        if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
            const dailyBalanceDataItem = record.dynamodb.NewImage;
            const dateSec = parseInt(dailyBalanceDataItem.DateSec.N);
            const yearMonth = moment.unix(dateSec).format("YYYY-M");
            const date = moment.unix(dateSec).format("D");
            const bankName = dailyBalanceDataItem.BankName.S;
            const dailyBalance = parseFloat(dailyBalanceDataItem.Balance.N);

            if (!tempMonthlyBalance.hasOwnProperty(yearMonth)) {
                tempMonthlyBalance[yearMonth] = {};
                tempDailyBalanceMapping[yearMonth] = {};
            }
            if (!tempMonthlyBalance[yearMonth].hasOwnProperty(bankName)) {
                tempMonthlyBalance[yearMonth][bankName] = 0;
                tempDailyBalanceMapping[yearMonth][bankName] = {};
            }
            tempMonthlyBalance[yearMonth][bankName] += dailyBalance;
            tempDailyBalanceMapping[yearMonth][bankName][date] = dailyBalance;
        }
    });

    for(const yearMonth in tempMonthlyBalance) if(tempMonthlyBalance.hasOwnProperty(yearMonth) && tempMonthlyBalance[yearMonth]) {
        for (const bankName in tempMonthlyBalance[yearMonth]) if (tempMonthlyBalance[yearMonth].hasOwnProperty(bankName) && tempMonthlyBalance[yearMonth][bankName]) {
            console.log("Start query monthly balance table for " + yearMonth + bankName);
            const queryParams = {
                TableName: MONTHLY_BALANCE_TABLE,
                ProjectionExpression: 'BankName, YearMonth, Balance, DailyBalanceMap',
                KeyConditionExpression: 'BankName = :bankName and YearMonth = :yearMonth',
                ExpressionAttributeValues: {
                    ":bankName": bankName,
                    ":yearMonth":yearMonth
                }
            };
            dynamodb.query(queryParams, function(err, data) {
                if(err) {
                    console.error("Got an error querying monthly balance with params:");
                    console.error(JSON.stringify(queryParams, null, 2));
                    callback(new Error(err));
                } else {
                    if(data.Items.length === 0) {
                        console.log("No monthly balance data for this year-month yet. Initialize the balance data.");

                        const putParams = {
                            TableName: MONTHLY_BALANCE_TABLE,
                            Item: {
                                YearMonth: yearMonth,
                                BankName: bankName,
                                Balance: tempMonthlyBalance[yearMonth][bankName],
                                DailyBalanceMap: tempDailyBalanceMapping[yearMonth][bankName]
                            }
                        };
                        dynamodb.put(putParams, function(err, data) {
                            if(err) {
                                console.error("Failed to put the data");
                                callback(new Error(err));
                            } else {
                                console.log("Data successfully put to monthly balance table");
                            }
                        });
                    } else {
                        if(data.Items.length !== 1) {
                            callback(new Error("Daily balance retrieved from DynamoDB has more than 1 value"));
                        }
                        const monthlyBalanceDataItem = data.Items[0];
                        let dailyBalanceMap = monthlyBalanceDataItem.DailyBalanceMap;
                        console.log("daily balance map:");
                        console.log(monthlyBalanceDataItem.DailyBalanceMap);

                        for(const date in tempDailyBalanceMapping[yearMonth][bankName])
                            if(tempDailyBalanceMapping[yearMonth][bankName].hasOwnProperty(date)) {
                            dailyBalanceMap[date] = tempDailyBalanceMapping[yearMonth][bankName][date];
                        }

                        let monthlyBalance = 0;
                        for(const date in dailyBalanceMap) if(dailyBalanceMap.hasOwnProperty(date)) {
                            monthlyBalance += dailyBalanceMap[date];
                        }

                        const putParams = {
                            TableName: MONTHLY_BALANCE_TABLE,
                            Item: {
                                YearMonth: yearMonth,
                                BankName: bankName,
                                Balance: monthlyBalance,
                                DailyBalanceMap: dailyBalanceMap
                            }
                        };

                        dynamodb.put(putParams, function(err, data) {
                            if(err) {
                                console.error("Failed to put the data: ");
                                console.error(JSON.stringify(putParams, null, 2));
                                callback(new Error(err));
                            } else {
                                console.log("Data successfully update in monthly balance table");
                            }
                        });
                    }
                }
            });


        }
    }
};


