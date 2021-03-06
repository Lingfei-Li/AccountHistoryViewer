<template>
    <div id="historyRoot">
        <div class="row">
            <div class="col-sm-10 offset-sm-1">
                <div class="card">
                    <h3 class="card-header">{{title}}</h3>
                    <chart v-bind:transactionData="transactionData"></chart>
                    <div class="card-footer text-right">
                        <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('w', 1);">1 Week</button>
                        <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('w', 2);">2 Weeks</button>
                        <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('w', 3);">3 Weeks</button>
                        <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('M', 1);">1 Month</button>
                        <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('Q', 1);">1 Quarter</button>
                        <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('M', 6);">1/2 Year</button>
                        <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('y', 1);">1 Year</button>
                        <button class="btn btn-secondary" v-on:click="updateRangeDateGetAll()">All History</button>
                    </div>
                </div>
            </div>
        </div>
        <filters></filters>
        <detailsView v-bind:transaction="this.detailedTransaction"></detailsView>
    </div>
</template>

<style>
#historyRoot {
    text-align: center;
    margin-top: 20px;
}
</style>

<script>
import axios from 'axios';
import moment from 'moment';
import config from '../config';

import chart from './History/Chart.vue';
import detailsView from './History/DetailsView.vue';
import filters from './History/Filters.vue';

function toMomentDateTime(sec) {
    return moment.unix(sec);
}

export default {
    name: 'history-root',
    components: {
        chart,
        detailsView,
        filters
    },
    computed: {
        transactionData() {
            return this.$store.getters.filteredTransactionData;
        }
    },
    data () {
        return {
            title: "Title",
            detailedTransaction: {
                "description": "Description",
                "amount": 0
            },
            balanceData: []
        }
    },
    watch: {
        $route: function() {
            console.log("changed route. Id:", this.$route.params.id);
            const detailViewTransactionId = this.$route.params.id;
            const transactionDataWithId = this.$store.state.transactionData.filter(function(item) {
                return detailViewTransactionId === item['UUID'];
            });
            if(transactionDataWithId.length > 1) {
                console.warn("When updating detail view ID, found more than one transaction data with Id " + detailViewTransactionId);
            }
            else if(transactionDataWithId.length === 0) {
                console.log("Didn't find any matching transaction with Id " + detailViewTransactionId);
                console.log(this.$store.state.transactionData);
                return;
            }
            this.detailedTransaction = transactionDataWithId[0];
        }
    },
    methods: {
        setupBalanceData(transactionData) {
            if(transactionData.length === 0) return;
            const firstDate = transactionData[0]['TransactionDateSec'];
            let balance = {};
            let totalBalance = 0;
            axios.get(`${config.api.root}/${config.api.balance.root}/${config.api.balance.date}/${firstDate}`).then(response => {
                const balancePerBank = response.data.balancePerBank;
                let totalBalance = 0;
                for(const bank in balancePerBank) if(balancePerBank.hasOwnProperty(bank)) {
                    totalBalance += balancePerBank[bank];
                }
                this.$store.state.totalBalanceForFirstDate = totalBalance;
            }).catch(error => {
                console.error(error);
            });
        },
        processRawTransactionData(transactionData) {
            let processedTransactionData = transactionData;
            processedTransactionData = processedTransactionData.map(h => {
                h['TransactionDateTime'] = toMomentDateTime(h['TransactionDateSec']);
                return h;
            });

            processedTransactionData.sort((a, b) => {
                return a['TransactionDateSec'] - b['TransactionDateSec'];
            });

            this.setupBalanceData(transactionData);

            this.$store.state.transactionData = transactionData;
        },
        initOneMonthHistory() {
            let startDateSec = moment().subtract(1, 'months').unix();
            axios.get(`${config.api.root}/${config.api.transactions}/${startDateSec}/0`)
                .then(response => {
                    this.processRawTransactionData(response.data.transactions);
                });
        },
        updateHistoryRangeDate(startDateSec, endDateSec) {
            axios.get(`${config.api.root}/${config.api.transactions}/${startDateSec}/${endDateSec}`)
                .then(response => {
                    this.processRawTransactionData(response.data.transactions);
                })
                .catch(error => {
                    console.error(error);
                });
        },
        updateRangeDatePastPresent(period, number) {
            this.title = number + " " + period;
            this.updateHistoryRangeDate(moment().subtract(period, number).unix(), 0);
        },
        updateRangeDateGetAll() {
            axios.get(`${config.api.root}/${config.api.transactions}`)
                .then(response => {
                    this.processRawTransactionData(response.data.transactions);
                })
                .catch(error => {
                    console.error("ERROR", error);
                });
        },
    },
    mounted() {
        this.initOneMonthHistory();
    }
}
</script>



