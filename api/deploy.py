import subprocess
import json
import shutil
import os.path
from colorama import init, Fore

with open('../config/stack_config.json') as config_file:
    config = json.load(config_file)

init()

print(Fore.GREEN + "Copying CloudFormation template file to deployment directory")


cfnTemplateSrcPath = os.path.join('.', config['DevelopmentDir'],
                                       config['CloudFormationTemplateDir'],
                                       config['CloudFormationTemplateFilename'])

cfnTemplateDeployPath = os.path.join('.', config['DevelopmentDir'],
                                          config['CloudFormationTemplateFilename'])

outputTemplatePath = os.path.join('.', config['DevelopmentDir'],
                                       config['OutputTemplateFilename'])

shutil.copy(cfnTemplateSrcPath, cfnTemplateDeployPath)


try:
    subprocess.run(["scripts\package.bat",
                    cfnTemplateDeployPath,
                    outputTemplatePath,
                    config["DeploymentBucketName"]], shell=True, check=True)
    subprocess.run(["scripts\deploy.bat",
                    outputTemplatePath,
                    config["StackName"],
                    config["AccountTransactionsTableName"],
                    config["LastTransactionDateTableName"],
                    config["AccountDailyBalanceTableName"],
                    config["AccountMonthlyBalanceTableName"]], shell=True, check=True)
    subprocess.run(["scripts\clean.bat",
                    config["DeploymentBucketName"]], shell=True, check=True)

    print(Fore.GREEN + "Serverless Deployment completed")

    print(Fore.CYAN + "Removing CloudFormation and SAM template file from deployment directory")

    if os.path.exists(cfnTemplateDeployPath):
        os.remove(cfnTemplateDeployPath)
    if os.path.exists(outputTemplatePath):
        os.remove(outputTemplatePath)
except subprocess.CalledProcessError as e:
    out_bytes = e.output       # Output generated before error
    code      = e.returncode   # Return code
    print(out_bytes)
    print(code)
    print(Fore.RED + "Deployment Failed")
    exit(0)


print(Fore.GREEN + "Deployment Succeeded")
