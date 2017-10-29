import boto3
import json
from config import app_config
from accountTransactionModel import Transaction
import time
from utils import Logger as log


kinesis_client = boto3.client('kinesis', region_name='us-west-2')

stream_name = app_config['TransactionDataStreamName']

def describe_stream():
    response = kinesis_client.describe_stream(StreamName=stream_name)
    log.plain(response)


def put_transactions(transactions):
    log.info("Putting transactions to Kinesis stream")
    if len(transactions) == 0:
        return

    records = []
    for t in transactions:
        records.append({
            'Data': json.dumps(t.getItem()),
            'PartitionKey': t.getField('UUID')
        })

    put_response = kinesis_client.put_records(StreamName=stream_name, Records=records)
    return put_response

# Testing: put a mock record to the kinesis stream
if __name__ == '__main__':
    t = int(time.time())
    t_override = 1600319862
    trans = Transaction(TransactionDateSec=t_override, UUID='UUID-'+str(t), UserId='UserId-1234', AccountType='AccountType-checking',
                    Amount=1199, BankName='chase', Description='Description-something',
                    TransactionType='TransactionType-debit')
    transactions = [trans]
    put_response = put_transactions(transactions)
    if put_response['FailedRecordCount'] != 0:
       log.error( "Failed to put record to Kinesis. Message: " )
    else:
       log.success("Successfully put data to Kinesis")


