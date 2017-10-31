import json
import boto3
from boto3.dynamodb.conditions import  Key, Attr
import time
from utils import DecimalEncoder
from uuid import uuid1
import _thread
from threading import Thread
import csv
from utils import convert_to_date_sec
from utils import convert_money_to_float
from botocore.exceptions import  ClientError
from utils import convert_date_sec_to_datetime
from config import app_config

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')
transactions_table = dynamodb.Table(app_config["AccountTransactionsTableName"])
last_date_table = dynamodb.Table(app_config['LastTransactionDateTableName'])
daily_balance_table = dynamodb.Table(app_config['AccountDailyBalanceTableName'])
monthly_balance_table = dynamodb.Table(app_config['AccountMonthlyBalanceTableName'])

def clearDB(db, hash_key, range_key=None):
    if range_key is None:
        proj_expr = '#hash_key'
        ean = {"#hash_key": hash_key}
    else:
        proj_expr = '#hash_key, #range_key'
        ean = {"#hash_key": hash_key, '#range_key': range_key}

    response = db.scan(
        ProjectionExpression=proj_expr,
        ExpressionAttributeNames = ean
    )
    if len(response['Items']) == 0:
        return
    for item in response['Items']:
        print(item)
        db.delete_item(Key=item)
    print("Deletion completed")


# Testing: put a mock record to the kinesis stream
if __name__ == '__main__':
    clearDB(transactions_table, hash_key='TransactionDateSec', range_key='UUID')
    clearDB(last_date_table, hash_key='BankName')
    clearDB(daily_balance_table, hash_key='DateSec', range_key='BankName')
    clearDB(monthly_balance_table, hash_key='YearMonth', range_key='BankName')


