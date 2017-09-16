import sqlite3
from datetime import datetime


def create_db(conn, cursor):
    cursor.execute('''CREATE TABLE IF NOT EXISTS "transactions" (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, 
                    date TEXT, 
                    desc TEXT, 
                    type TEXT, 
                    amount REAL,
                    account TEXT)''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS total_balance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, 
                    date TEXT, 
                    balance REAL,
                    account TEXT)''')


def save_transactions(cursor, transactions, account):
    cursor.execute("SELECT date(date) FROM transactions ORDER BY date(date) DESC LIMIT 1")
    date_cutoff = cursor.fetchone()
    if date_cutoff is not None:
        date_cutoff = datetime.strptime(date_cutoff[0], "%Y-%m-%d")
    print('transaction cutoff:', date_cutoff)

    # transactions: [date, description, type, amount]
    for i in range(len(transactions)):
        if date_cutoff is not None and transactions[i][0] == date_cutoff:
            cursor.execute(
                "SELECT COUNT(*) FROM transactions WHERE date=? AND desc=? AND type=? AND amount=? AND account=?",
                (transactions[i][0], transactions[i][1], transactions[i][2], transactions[i][3], account))
            if cursor.fetchone()[0] != 0:
                continue
        elif date_cutoff is not None and transactions[i][0] < date_cutoff:
            continue

        cursor.execute("INSERT INTO transactions (date, desc, type, amount, account) VALUES (?, ?, ?, ?, ?)",
                       (transactions[i][0], transactions[i][1], transactions[i][2], transactions[i][3], account))


def save_total_balance(cursor, total_balance, account):
    cursor.execute("SELECT date(date) FROM total_balance ORDER BY date(date) DESC LIMIT 1")
    date_cutoff = cursor.fetchone()
    if date_cutoff is not None:
        date_cutoff = datetime.strptime(date_cutoff[0], "%Y-%m-%d")
    print('total balance cutoff:', date_cutoff)
    if date_cutoff is None or datetime.now().date() > date_cutoff.date():
        cursor.execute("INSERT INTO total_balance (date, balance, account) VALUES (?, ?, ?)",
                  (datetime.now().date(), total_balance, account))


def save_to_db(transactions, total_balance, account):
    conn = sqlite3.connect('account-history-service.db')
    c = conn.cursor()

    create_db(conn, c)

    save_transactions(c, transactions, account)
    save_total_balance(c, total_balance, account)

    conn.commit()
    conn.close()


def read_all_transactions():
    conn = sqlite3.connect('account_history-service.db')
    c = conn.cursor()
    for item in c.execute("SELECT * FROM transactions"):
        print(item)
    for item in c.execute("SELECT * FROM total_balance"):
        print(item)
    conn.commit()
    conn.close()


'''
trans = [
    [convert_to_date('Jun 12, 2017', None), 'debit', 'purchase at restaurant', convert_money_to_float('$123,456.789')]]
save_to_db(trans, 1000, 'chase')

read_all_transactions()

'''
