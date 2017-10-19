from selenium.common.exceptions import StaleElementReferenceException
from crawlers import ChaseCrawler
from crawlers import USBankCrawler
from config import accounts
from ddb_dao import put_transactions
from ddb_dao import filter_unprocessed_transactions
import time


for account in accounts:
    if account['bank'].lower() == 'usbank':
        with USBankCrawler(account['username'], account['password'], account['questions']) as crawler:
            try:
                trans = crawler.start_extraction()
            except StaleElementReferenceException:
                print("handling exception...")
                trans = crawler.start_extraction()

            print("done.")

            # Put data into database
            put_transactions(account['bank'], trans)
    elif account['bank'].lower() == 'chase':
        with ChaseCrawler(account['username'], account['password']) as crawler:
            try:
                trans = crawler.start_extraction()
            except StaleElementReferenceException:
                print("handling exception...")
                trans = crawler.start_extraction()

            print("done.")

            filter_unprocessed_transactions(account['bank'].lower, trans)

            # Put data into database
            put_transactions(account['bank'], trans)
    else:
        print("Banks other than chase/usbank is not supported yet")

    print("Sleeping 5 seconds")
    time.sleep(5)

print('All Done')

