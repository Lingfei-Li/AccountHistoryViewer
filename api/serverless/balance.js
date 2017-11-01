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
                                Balance: tempDailyBalance[dateSec][bankName],
                                RecordedTransactionsId: tempTransactionIds[dateSec][bankName]
                            }
                        };
                        dynamodb.put(putParams, function(err, data) {
                            if(err) {
                                console.error("Failed to put the data: ");
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
                                Balance: balance + tempDailyBalance[dateSec][bankName],
                                RecordedTransactionsId: recordedTransactionsId.concat(tempTransactionIds[dateSec][bankName])
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

    for(const yearMonth in tempMonthlyBalance) if(tempMonthlyBalance.hasOwnProperty(yearMonth)) {
        for (const bankName in tempMonthlyBalance[yearMonth]) if (tempMonthlyBalance[yearMonth].hasOwnProperty(bankName)) {
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


