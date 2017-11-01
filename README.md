# ProjectErebor
Project Erebor is my personal effort to create a toolkit to monitor, analyze and understand my bank account changes. The name comes from the Lonely Mountain, the home of the Folk of Durin. 

## Backend
### Overview
The idea of Serverless is being widely used in my team so I also applied it here. Thus, the backend design of Project Erebor is composed of 2 components: 1.a transaction crawler and 2.a set of stream processors. 

For this project, the serverless architecture helps improve responsibilty separation and reduce service failure impact. 

The transaction crawler is made as thin as possible whose responsibility is exclusively downloading the data and pushing to Kinesis stream. No processing is applied by the crawler. 

Each stream processor is responsible for the thinnest possible task so that the development process can be focused. 

The daily balance DB and monthly balance DB work together to provide the total account balance at any date. They are a "Snapshot" of account balances. Without them, the only options I can think of are 1.send all data to frontend and it calculates the balance itself 2.compute the sum of transaction amount from day 1 for each balance request. Neither of them gives an acceptable time and resource consomption. 

### Architecture
![alt text](https://github.com/Lingfei-Li/ProjectErebor/raw/master/BackendServerlessArchitecture.png)

## Frontend

### Overview
I'm using Vue.js for the frontend. More details TBD
