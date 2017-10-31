from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from utils import convert_to_date_sec
from utils import convert_money_to_float
from accountTransactionModel import Transaction

from uuid import uuid1
import time
import csv
import os


class BankCrawler:
    def start_extraction(self): raise NotImplementedError


class ChaseCrawler(BankCrawler):
    def __init__(self, username, password):
        driver = webdriver.Chrome("browser_drivers/chromedriver.exe")
        driver.set_page_load_timeout(100)
        driver.implicitly_wait(100)

        driver.get("https://secure07a.chase.com/")
        frame = driver.find_element_by_css_selector("#logonbox")
        driver.switch_to.frame(frame)
        driver.find_element_by_id("userId-input-field").send_keys(username)
        driver.find_element_by_css_selector("#password-input-field").send_keys(password)
        driver.find_element_by_id("signin-button").click()
        self.driver = driver

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.driver.quit()

    def get_transactions(self, account):
        print("getting amount values..")
        date_str = self.driver.find_elements_by_css_selector(".date")
        desc = self.driver.find_elements_by_css_selector(".DDAdescription .BODY")
        type = self.driver.find_elements_by_css_selector(".amount .BODY")
        amount = self.driver.find_elements_by_css_selector(".amount .smvalue")
        transactions = []

        if len(desc) != len(type) or len(desc) != len(amount) or len(type) != len(amount):
            print("Array size doesn't match!")
        else:
            for i in range(len(desc)):
                try:
                    date_sec = convert_to_date_sec(date_str[i].text, "%b %d, %Y")
                except ValueError:
                    print("Cannot parse date: ", date_str[i].text)
                    continue

                newTransaction = Transaction(TransactionDateSec=date_sec, UUID=str(uuid1()), UserId="lingfei",
                                             AccountType=account, Amount=convert_money_to_float(amount[i].text),
                                             BankName='Chase', Description=desc[i].text,
                                             TransactionType=type[i].text)

                transactions.append(newTransaction)
        return transactions

    def start_extraction(self):
        checking_transactions = self.get_transactions('checking')

        # switch to savings account
        self.driver.find_element_by_css_selector('#tile-610307262').click()
        savings_transactions = self.get_transactions('savings')

        return checking_transactions + savings_transactions


class USBankCrawler(BankCrawler):
    def __init__(self, username, password, questions):
        chromeOptions = webdriver.ChromeOptions()
        prefs = {"download.default_directory": "D:\\"}
        chromeOptions.add_experimental_option("prefs", prefs)
        chromedriver = "browser_drivers/chromedriver.exe"
        driver = webdriver.Chrome(executable_path=chromedriver, chrome_options=chromeOptions)

        driver.set_page_load_timeout(100)
        driver.implicitly_wait(100)

        driver.get("https://onlinebanking.usbank.com/Auth/Login")
        driver.find_element_by_id("txtPersonalId").send_keys(username)
        driver.find_element_by_id("txtPersonalId").send_keys(Keys.RETURN)

        q = driver.find_element_by_css_selector("#mainContainer > div.lw-AuthMainContainer.ng-scope > "
                                                "div.lw-floatLeft.ng-isolate-scope > form:nth-child(3) > "
                                                "div.lw-positionRelative.lw-AuthContainer.lw-AuthContainerStepUp > "
                                                "div > div:nth-child(1) > div > div:nth-child(1) > label"
                                                ).get_attribute('innerHTML')
        ans = ""
        for question, answer in questions.items():
            if question in q:
                ans = answer
        driver.find_element_by_css_selector("#divAlphaNum > input").send_keys(ans)
        driver.find_element_by_css_selector("#divAlphaNum > input").send_keys(Keys.RETURN)

        driver.find_element_by_id("txtPassword").send_keys(password)
        driver.find_element_by_id("txtPassword").send_keys(Keys.RETURN)
        self.driver = driver

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.driver.quit()

    def readCSV(self, account, filepath):
        transactions = []
        with open(filepath) as csvfile:
            reader = csv.reader(csvfile, delimiter=',', quotechar='"')
            for row in reader:
                date_str = row[0]       # transaction_date
                type = row[1]           # direction
                description = row[2]    # description
                amount = row[4]         # amount
                try:
                    date_sec = convert_to_date_sec(date_str, "%m/%d/%Y")
                except ValueError:
                    if date_str != 'Date':
                        print("Cannot parse date: ", date_str)
                    continue

                newTransaction = Transaction(TransactionDateSec=date_sec, UUID=str(uuid1), UserId="lingfei",
                                             AccountType=account, Amount=convert_money_to_float(amount),
                                             BankName='USBank', Description=description,
                                             TransactionType=type)

                transactions.append(newTransaction)
        return transactions

    def readCSVThenDelete(self, account):
        if account == 'checking':
            filepath = 'D:\\export.csv'
        else:
            filepath = 'D:\\export (1).csv'
        transactions = self.readCSV(account, filepath)
        os.remove(filepath)
        return transactions


    def start_extraction(self):
        # Checking account
        self.driver.find_element_by_css_selector("#DepositAccountsTable > tbody > "
                                                 "tr.padded-row.trx_greyArea_odd > td.accountRowFirst > a").click()
        self.driver.find_element_by_css_selector("#DownloadTransactionsLink > a").click()
        self.driver.find_element_by_css_selector("#FromDateInput").clear()
        self.driver.find_element_by_css_selector("#FromDateInput").send_keys("08/01/2015")
        self.driver.execute_script("ExportDownloadTransactions()")

        # Savings account
        self.driver.find_element_by_css_selector("#AccountDDL-button > a").click()
        self.driver.find_element_by_css_selector("#AccountDDL-menu > li.ui-corner-bottom > a").click()
        self.driver.find_element_by_css_selector("#FromDateInput").clear()
        self.driver.find_element_by_css_selector("#FromDateInput").send_keys("08/01/2015")
        self.driver.execute_script("ExportDownloadTransactions()")

        # Wait for downloading to complete
        time.sleep(2)

        # Parse the downloaded csv and read the transactions
        checking_transactions = self.readCSVThenDelete('checking')
        savings_transactions = self.readCSVThenDelete('savings')
        return checking_transactions + savings_transactions

