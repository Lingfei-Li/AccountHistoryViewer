
import time
import boto3
from config import app_config

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')
transactions_table = dynamodb.Table(app_config["AccountTransactionsTableName"])
last_date_table = dynamodb.Table(app_config['LastTransactionDateTableName'])
daily_balance_table = dynamodb.Table(app_config['AccountDailyBalanceTableName'])
monthly_balance_table = dynamodb.Table(app_config['AccountMonthlyBalanceTableName'])


def clear_db(db, hash_key, range_key=None):
    if range_key is None:
        proj_expr = '#hash_key'
        ean = {"#hash_key": hash_key}
    else:
        proj_expr = '#hash_key, #range_key'
        ean = {"#hash_key": hash_key, '#range_key': range_key}

    data = db.scan(
        ProjectionExpression=proj_expr,
        ExpressionAttributeNames = ean
    )['Items']
    if len(data) == 0:
        return
    for item in data:
        print(item)
        db.delete_item(Key=item)
    print("Deletion completed")


def clear_all_db():
    clear_db(transactions_table, hash_key='TransactionDateSec', range_key='UUID')
    clear_db(last_date_table, hash_key='BankName')
    clear_db(daily_balance_table, hash_key='DateSec', range_key='BankName')
    clear_db(monthly_balance_table, hash_key='YearMonth', range_key='BankName')

# Testing: put a mock record to the kinesis stream
if __name__ == '__main__':
    clear_all_db()
