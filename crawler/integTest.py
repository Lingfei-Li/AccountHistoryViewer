
import time
from kinesis import Transaction, put_transactions
from utils import Logger as log
import boto3
from config import app_config

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')
transactions_table = dynamodb.Table(app_config["AccountTransactionsTableName"])
last_date_table = dynamodb.Table(app_config['LastTransactionDateTableName'])
daily_balance_table = dynamodb.Table(app_config['AccountDailyBalanceTableName'])
monthly_balance_table = dynamodb.Table(app_config['AccountMonthlyBalanceTableName'])


TEST_CONFIG = {
    'totalTransactions': 30,
    'dailyBalance': {
        '1600319862': {
            'chase': 9
        },
        '1600419862': {
            'chase': 9
        }
    },
    'monthlyBalance': {
        '2020-9': {
            'chase': 18
        }
    },
    'lastTransactionDate': {
        'chase': 1600419862
    }

}

def scan_db(db, hash_key, range_key=None):
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
    return response

def clear_db(db, hash_key, range_key=None):
    data = scan_db(db, hash_key, range_key)
    if len(data) == 0:
        return
    for item in data:
        print(item)
        db.delete_item(Key=item)
    print("Deletion completed")

def put_data():
    #TODO: use TEST_CONFIG
    t = int(time.time())
    t_override = 1600419862
    transactions = []
    for i in range(10):
        trans = Transaction(TransactionDateSec=t_override, UUID='UUID-'+str(t+i), UserId='UserId-1234', AccountType='AccountType-checking',
                            Amount=1, BankName='chase', Description='Description-something',
                            TransactionType='TransactionType-debit')
        transactions.append(trans)
    put_response = put_transactions(transactions)
    if put_response['FailedRecordCount'] != 0:
        log.error( "Failed to put record to Kinesis. Message: " )
    else:
        log.success("Successfully put data to Kinesis")

def check_transactions(db=transactions_table, hash_key='TransactionDateSec', range_key='UUID'):
    data = scan_db(db, hash_key, range_key)
    if len(data) != TEST_CONFIG['totalTransactions']:
        raise Exception('Total transaction count incorrect')

def check_daily_balance(db=last_date_table, hash_key='BankName'):
    data = scan_db(db, hash_key)
    #TODO: test cases

def check_monthly_balance(db=daily_balance_table, hash_key='DateSec', range_key='BankName'):
    data = scan_db(db, hash_key, range_key)
    #TODO: test cases

def check_last_transaction_date(db=monthly_balance_table, hash_key='YearMonth', range_key='BankName'):
    data = scan_db(db, hash_key, range_key)
    #TODO: test cases

def check_all_data():
    check_transactions()
    check_daily_balance()
    check_monthly_balance()
    check_last_transaction_date()

def clear_all_db():
    clear_db(transactions_table, hash_key='TransactionDateSec', range_key='UUID')
    clear_db(last_date_table, hash_key='BankName')
    clear_db(daily_balance_table, hash_key='DateSec', range_key='BankName')
    clear_db(monthly_balance_table, hash_key='YearMonth', range_key='BankName')

# Testing: put a mock record to the kinesis stream
if __name__ == '__main__':
    put_data()
    time.sleep(5)
    check_all_data()
    time.sleep(5)
    clear_all_db()


