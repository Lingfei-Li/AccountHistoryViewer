from datetime import datetime
import json, decimal
from colorama import init, Fore, Back, Style

init()


class Logger:
    @staticmethod
    def info(*msg):
        Logger.__colorPrint(Fore.CYAN, msg)
    @staticmethod
    def success(*msg):
        Logger.__colorPrint(Fore.GREEN, msg)

    @staticmethod
    def error(*msg):
        Logger.__colorPrint(Fore.RED, msg)

    @staticmethod
    def plain(*msg):
        Logger.__colorPrint(Fore.WHITE, msg)

    @staticmethod
    def __colorPrint(color, msg):
        output = ""
        for m in msg:
            output += str(m) + " "
        print(color + output)


def convert_to_date_sec(date_str, format="%b %d, %Y"):
    if format is None:
        format = "%b %d, %Y"
    return int((datetime.strptime(str(date_str), format) - datetime(1970, 1, 1)).total_seconds())


def convert_date_sec_to_datetime(sec):
    return datetime.fromtimestamp(sec)


def convert_money_to_float(money):
    return float(str(money).replace("−", "-").replace("$", "").replace(",", ""))


# Helper class to convert a DynamoDB item to JSON.
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 > 0:
                return float(o)
            else:
                return int(o)
        return super(DecimalEncoder, self).default(o)
