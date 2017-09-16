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

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')
history_table = dynamodb.Table('account-history-service')
last_date_table = dynamodb.Table('last-transaction-date')


def get_dynamodb():
    return dynamodb

def get_history_table():
    return history_table

def get_last_date_table():
    return last_date_table

def get_all_history():
    response = history_table.scan(
        ProjectionExpression="account, amount, bank, description, transaction_date_sec, #typ",
        ExpressionAttributeNames={'#typ': 'type'}
    )
    result = response['Items']
    for item in result:
        print(item['amount'])
        item['amount'] = convert_money_to_float(item['amount'])
        item['transaction_date_sec'] = int(item['transaction_date_sec'])
    return result


def put_history(bank, history_list):
    print("Filtering processed history. Total: ", len(history_list))
    history_list = filter_unprocessed_transactions(bank, history_list)
    print("Filtering completed. Left: ", len(history_list))
    idx = 0
    max_transaction_date_sec = 0
    with history_table.batch_writer() as batch:
        for history in history_list:
            batch.put_item(
                Item={
                    'id': str(uuid1()),
                    'create_date_sec': int(round(time.time())),
                    'transaction_date_sec': history['date_sec'],
                    'type': history['type'],
                    'description': history['description'],
                    'amount': history['amount'],
                    'bank': history['bank'],
                    'account': history['account']
                }
            )
            idx += 1
            if history['date_sec'] > max_transaction_date_sec:
                max_transaction_date_sec = history['date_sec']
            print("{}/{}\n{}\n{}\n".format(idx, len(history_list), history['amount'], history['description']))
    print('Writing last transaction date sec')
    if max_transaction_date_sec != 0:
        put_last_transaction_date(bank, max_transaction_date_sec)

def get_history_on_date(bank, dateSec):
    response = history_table.scan(
        ProjectionExpression="account, amount, bank, description, transaction_date_sec, #typ",
        ExpressionAttributeNames={'#typ': 'type'},
        FilterExpression=Attr('transaction_date_sec').eq(dateSec)
    )
    result = response['Items']
    for item in result:
        item['amount'] = convert_money_to_float(item['amount'])
        item['transaction_date_sec'] = int(item['transaction_date_sec'])
    return result

def get_last_transaction_date_from_history(bank):
    print("Getting last transaction date for bank {}".format(bank))
    response = history_table.scan(
        ProjectionExpression="transaction_date_sec",
        FilterExpression=Key('bank').eq(bank),
    )
    if len(response['Items']) == 0:
        raise ValueError('no record is found for bank {}'.format(bank))
    max_date = 0
    for item in response['Items']:
        print(item)
        if item['transaction_date_sec'] > max_date:
            max_date = item['transaction_date_sec']
    return max_date

def get_last_transaction_date(bank):
    print("Getting last update date for bank {}".format(bank))
    response = last_date_table.query(
        ProjectionExpression="bank, sequenceNumber, transactionDateSec",
        KeyConditionExpression=Key('bank').eq(bank),
        ScanIndexForward=False,
        Limit=1
    )
    if len(response['Items']) == 0:
        raise ValueError('no record is found for bank {}'.format(bank))
    result = response['Items'][0]
    result['sequenceNumber'] = int(result['sequenceNumber'])
    result['transactionDateSec'] = int(result['transactionDateSec'])
    print('Last transaction date for {} is {}'.format(bank, result['transactionDateSec']))
    return result


def put_last_transaction_date(bank, transactionDateSec):
    print("Putting last transaction date")
    try:
        last_transaction_date = get_last_transaction_date(bank)
        last_sequence_number = last_transaction_date['sequenceNumber']
    except:
        last_sequence_number = 0
    response = last_date_table.put_item(
        Item={
            'bank': bank,
            'sequenceNumber': last_sequence_number+1,
            'transactionDateSec': transactionDateSec
        }
    )
    print("New last transaction date:", str(transactionDateSec), "version:", last_sequence_number+1)
    print("Putting last transaction date - completed")

def filter_unprocessed_transactions(bank, transactions):
    last_transaction_date_sec = 0
    history_on_last_transaction_date = []
    try:
        last_transaction = get_last_transaction_date(bank)
        last_transaction_date_sec = last_transaction['transactionDateSec']
        history_on_last_transaction_date = get_history_on_date(bank, last_transaction_date_sec)
        print('history on the last transaction day:')
        for t in history_on_last_transaction_date:
            print(t['description'])
    except:
        print('no last transaction date is found for bank {}'.format(bank))
    result = []
    for t in transactions:
        duplicate = False
        if int(t['date_sec']) < int(last_transaction_date_sec):
            duplicate = True
        elif int(t['date_sec']) == int(last_transaction_date_sec):
            for history in history_on_last_transaction_date:
                if t['amount'] == history['amount'] \
                        and t['bank'] == history['bank'] \
                        and t['account'] == history['account'] \
                        and t['description'] == history['description'] \
                        and t['type'] == history['type']:
                    print("WARN: Exactly same transaction on the same day: {}".format(t))
                    duplicate = True
                    break
        if not duplicate:
            result.append(t)
    return result


if __name__ == '__main__':
    # response = get_last_transaction_date('usbank1')
    # response = get_history_on_date('usbank', 1477872000)
    # response = get_all_history()
    # print('total: {}'.format(len(response)))
    # response2 = filter_unprocessed_transactions('chase', response)
    # print('filtered: {}'.format(len(response2)))
    response3 = get_last_transaction_date_from_history('USBank')
    print(response3)
    pass

