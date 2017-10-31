'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');

const DAILY_BALANCE_TABLE = process.env.ACCOUNT_DAILY_BALANCE_TABLE;
const MONTHLY_BALANCE_TABLE = process.env.ACCOUNT_MONTHLY_BALANCE_TABLE;

const dynamodb = new AWS.DynamoDB.DocumentClient();

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

    for(const dateSecStr in tempDailyBalance) if(tempDailyBalance.hasOwnProperty(dateSecStr)) {
        const dateSec = parseInt(dateSecStr);
        for(const bankName in tempDailyBalance[dateSecStr]) if(tempDailyBalance[dateSecStr].hasOwnProperty(bankName)) {
            console.log(typeof dateSecStr);
            console.log('dateSecStr', dateSecStr, 'dateSec', dateSec, 'bankName', bankName);
            let params = {
                TableName: DAILY_BALANCE_TABLE,
                ProjectionExpression: 'BankName, DateSec, Balance, RecordedTransactionsId',
                KeyConditionExpression: 'BankName = :bankName and DateSec = :dateSec',
                ExpressionAttributeValues: {
                    ":bankName": bankName,
                    ":dateSec": dateSec
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
                                DateSec: dateSec,
                                Balance: tempDailyBalance[dateSec][bankName],
                                RecordedTransactionsId: tempTransactionIds[dateSec][bankName]
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
                        let params = {
                            TableName: DAILY_BALANCE_TABLE,
                            Item: {
                                BankName: bankName,
                                DateSec: dateSec,
                                Balance: balance + tempDailyBalance[dateSec][bankName],
                                RecordedTransactionsId: recordedTransactionsId.concat(tempTransactionIds[dateSec][bankName])
                            }
                        };
                        dynamodb.put(params, function(err, data) {
                            if(err) {
                                console.error("Failed to put the data: ");
                                console.error(JSON.stringify(params.Item, null, 2));
                                console.error("error:\n", err);
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

    //TODO: fix bug - race condition
    event.Records.forEach((record) => {
        if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
            const dailyBalanceDataItem = record.dynamodb.NewImage;
            const dateSec = parseInt(dailyBalanceDataItem.DateSec.N);
            const yearMonth = moment.unix(dateSec).format("YYYY-M");
            const date = moment.unix(dateSec).format("D");
            const bankName = dailyBalanceDataItem.BankName.S;
            const dailyBalance = parseFloat(dailyBalanceDataItem.Balance.N);

            let params = {
                TableName: MONTHLY_BALANCE_TABLE,
                ProjectionExpression: 'BankName, YearMonth, Balance, DailyBalanceMap',
                KeyConditionExpression: 'BankName = :bankName and YearMonth = :yearMonth',
                ExpressionAttributeValues: {
                    ":bankName": bankName,
                    ":yearMonth":yearMonth
                }
            };

            console.log("Start query monthly balance table for current data");
            dynamodb.query(params, function(err, data) {
                if(err) {
                    console.error("Got an error querying monthly balance");
                    console.error(err);
                    callback(new Error(err));
                } else {
                    if(data.Items.length === 0) {
                        console.log("No monthly balance data for this year-month yet. Initialize the balance data.");

                        const dailyBalanceMap = {};
                        dailyBalanceMap[date] = dailyBalance;
                        let params = {
                            TableName: MONTHLY_BALANCE_TABLE,
                            Item: {
                                YearMonth: yearMonth,
                                BankName: bankName,
                                Balance: dailyBalance,
                                DailyBalanceMap: dailyBalanceMap
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
                        const monthlyBalanceDataItem = data.Items[0];
                        let dailyBalanceMap = monthlyBalanceDataItem.DailyBalanceMap;
                        console.log("daily balance map:");
                        console.log(monthlyBalanceDataItem.DailyBalanceMap);

                        dailyBalanceMap[date] = dailyBalance;

                        let monthlyBalance = 0;
                        for(let key in dailyBalanceMap) {
                            monthlyBalance += dailyBalanceMap[key];
                        }

                        let params = {
                            TableName: MONTHLY_BALANCE_TABLE,
                            Item: {
                                YearMonth: yearMonth,
                                BankName: bankName,
                                Balance: monthlyBalance,
                                DailyBalanceMap: dailyBalanceMap
                            }
                        };
                        dynamodb.put(params, function(err, data) {
                            if(err) {
                                console.error("Failed to put the data: ");
                                console.error(JSON.stringify(params.Item, null, 2));
                                console.error("error:\n", err);
                                callback(new Error(err));
                            } else {
                                console.log("Data successfully update in monthly balance table");
                            }
                        });
                    }
                }
            });
        }
    });
};


