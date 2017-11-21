import boto3
import json
from config import app_config
from accountTransactionModel import Transaction
import time
from utils import Logger as log
import datetime


kinesis_client = boto3.client('kinesis', region_name='us-west-2')

stream_name = app_config['TransactionDataStreamName']


def describe_stream():
    response = kinesis_client.describe_stream(StreamName=stream_name)
    log.plain(response)


def put_transactions(transactions):
    log.info("Putting {} transactions to Kinesis stream".format(len(transactions)))
    if len(transactions) == 0:
        return

    records = []
    for t in transactions:
        log.plain("{}".format("{} {}".format(t.getField('Amount'), t.getField('Description'))))
        records.append({
            'Data': json.dumps(t.getItem()),
            'PartitionKey': t.getField('UUID')
        })

    return kinesis_client.put_records(StreamName=stream_name, Records=records)

# Testing: put a mock record to the kinesis stream
if __name__ == '__main__':
    data_cnt = 10
    uuid_base_time = int(time.time())
    uuid_base = uuid_base_time
    # uuid_base = int(datetime.datetime(2020, 8, 2).timestamp())
    transaction_date_sec = int(datetime.datetime(2020, 8, 2).timestamp())
    mock_transactions = []
    for i in range(data_cnt):
        trans = Transaction(TransactionDateSec=transaction_date_sec, UUID='UUID-'+str(uuid_base+i),
                            UserId='UserId-1234', AccountType='checking', Amount=i, BankName='chase',
                            Description='Description-something-'+str(i), TransactionType='debit')
        mock_transactions.append(trans)
    put_response = put_transactions(mock_transactions)
    if put_response['FailedRecordCount'] != 0:
        log.error("Failed to put record to Kinesis. Message: ", put_response)
    else:
        log.success("Successfully put {} records to Kinesis".format(data_cnt))


