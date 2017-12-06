'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const moment = require('moment');
const response = require('response');

const LAST_TRANSACTION_DATE_TABLE = process.env.LAST_TRANSACTION_DATE_TABLE;
const DAILY_BALANCE_TABLE = process.env.ACCOUNT_DAILY_BALANCE_TABLE;
const MONTHLY_BALANCE_TABLE = process.env.ACCOUNT_MONTHLY_BALANCE_TABLE;
const TRANSACTIONS_TABLE = process.env.ACCOUNT_TRANSACTIONS_TABLE_NAME;

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.getAllTransactions = (event, context, callback) => {
    console.log("Received request: get all transactions. Event:", event);
    const params = {
        TableName: TRANSACTIONS_TABLE,
        ProjectionExpression: 'TransactionDateSec, #_UUID, UserId, AccountType, Amount, BankName, Description, TransactionType',
        ExpressionAttributeNames: {
            '#_UUID': 'UUID',
        },
    };
    dynamodb.scan(params, function(err, data) {
        if(err) {
            callback(response.internalError(err));
        } else {
            callback(null, response.successWithTransactions(data.Items));
        }
    });
};

exports.getTransactionsBetweenDates = (event, context, callback) => {
    console.log("Received request: get transactions between date. Event:", event);
    const startDateSec = parseInt(event.pathParameters['startDateSec']);
    let endDateSec = parseInt(event.pathParameters['endDateSec']);
    if(endDateSec <= startDateSec) {
        endDateSec = moment().unix();
    }
    if(isNaN(startDateSec) || isNaN(endDateSec)) {
        callback(response.clientError("Path parameters missing or they cannot be converted to integer"));
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
            callback(response.internalError(err));
        } else {
            callback(null, response.successWithTransactions(data.Items));
        }
    });
};


exports.getBalanceForDate = (event, context, callback) => {
    console.log("Received request: balance of date. Event:", event);
    console.log("DateSec:", event.pathParameters.dateSec);

    const dateSec = parseInt(event.pathParameters.dateSec);
    if(isNaN(dateSec)) {
        return callback(response.clientError("Path parameter 'dateSec' missing or it cannot be converted to integer"));
    }
    const requestedDateTime = moment.unix(dateSec);

    const monthlyBalanceQueryParams = {
        TableName: MONTHLY_BALANCE_TABLE,
        ProjectionExpression: 'YearMonth, BankName, Balance, DailyBalanceMap'
    };
    dynamodb.scan(monthlyBalanceQueryParams, function(err, data) {
        if(err) {
            callback(response.internalError(err));
        } else {
            const monthlyBalanceData = data.Items;
            console.log(monthlyBalanceData);
            let balancePerBank = {};
            for(let i = 0; i < monthlyBalanceData.length; i ++) {
                const balanceData = monthlyBalanceData[i];
                const yearMonth = balanceData['YearMonth'];
                const bankName = balanceData['BankName'];
                let balance = parseFloat(balanceData['Balance']);
                const dailyBalanceMap = balanceData['DailyBalanceMap'];
                const year = parseInt(yearMonth.split('-')[0]);
                const month = parseInt(yearMonth.split('-')[1]);
                if(year < requestedDateTime.year() || year === requestedDateTime.year() && month <= requestedDateTime.month()) {
                    if(bankName && !isNaN(balance)) {
                        if(year === requestedDateTime.year() && month === requestedDateTime.month()) {
                            balance = 0;
                            for(let dateOfMonth = 1; dateOfMonth <= requestedDateTime.date(); dateOfMonth ++) {
                                if(dateOfMonth in dailyBalanceMap) {
                                    balance += parseFloat(dailyBalanceMap[dateOfMonth]);
                                }
                            }
                        }
                        if(bankName in balancePerBank) {
                            balancePerBank[bankName] += balance;
                        } else {
                            balancePerBank[bankName] = balance;
                        }
                    } else {
                        return callback(response.clientError("BankName or Balance data cannot be retrieved from DynamoDB records: " + monthlyBalanceData))
                    }
                }
            }
            return callback(null, response.successWithBalancePerBank(balancePerBank));
        }
    });
};
