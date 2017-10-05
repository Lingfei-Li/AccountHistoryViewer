<template>
    <div id="historyRoot">
        <div>
            {{ transactionData.length }}
        </div>
        <chart v-bind:transactionData="this.transactionData"></chart>
        <div>
            <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('w', 1);">1 Week</button>
            <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('M', 1);">1 Month</button>
            <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('Q', 1);">1 Quarter</button>
            <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('M', 6);">1/2 Year</button>
            <button class="btn btn-secondary" v-on:click="updateRangeDatePastPresent('y', 1);">1 Year</button>
            <button class="btn btn-secondary" v-on:click="updateRangeDateGetAll()">All History</button>
        </div>
        <detailsView v-bind:transaction="this.detailedTransaction"></detailsView>
    </div>
</template>

<style>
#historyRoot {
    text-align: center;
}
</style>

<script>
import axios from 'axios';
import moment from 'moment';
import config from '../config';

import chart from './History/Chart.vue';
import detailsView from './History/DetailsView.vue';

function toMomentDateTime(sec) {
    return moment.unix(sec);
}

export default {
    name: 'history-root',
    components: {
        chart,
        detailsView
    },
    data () {
        return {
            transactionData: [],
            detailedTransaction: {
                "description": "ABC",
                "amount": 123
            },
            balanceData: []
        }
    },
    watch: {
        $route: function() {
            console.log("changed route. Id:", this.$route.params.id);
            const detailViewTransactionId = this.$route.params.id;
            const transactionDataWithId = this.transactionData.filter(function(item) {
                return detailViewTransactionId === item.id;
            });
            if(transactionDataWithId.length > 1) {
                console.warn("When updating detail view ID, found more than one transaction data with Id " + detailViewTransactionId);
            }
            else if(transactionDataWithId.length === 0) {
                console.log("Didn't find any matching transaction with Id " + detailViewTransactionId);
                console.log(this.transactionData);
                return;
            }
            const detailViewTransaction = transactionDataWithId[0];
            this.detailedTransaction = {
                "description": detailViewTransaction.description,
                "amount": detailViewTransaction.amount
            }
        }
    },
    methods: {
        updateTransactionDetails(transactionDetails) {
            this.transactionDetails = transactionDetails;
        },
        processRawTransactionData(transactionData) {
            this.transactionData = transactionData;

            this.transactionData = this.transactionData.map(h => {
                h.transaction_datetime = toMomentDateTime(parseInt(h.transaction_date_sec));
                return h;
            });
        },
        initOneMonthHistory() {
            let startDateSec = moment().subtract(1, 'months').unix();
            axios.get(`${config.api.historyRoot}/${startDateSec}/0`)
                .then(response => {
                    this.processRawTransactionData(response.data.history);
                });
        },
        updateHistoryRangeDate(startDateSec, endDateSec) {
            axios.get(`${config.api.historyRoot}/${startDateSec}/${endDateSec}`)
                .then(response => {
                    this.processRawTransactionData(response.data.history);
                })
                .catch(error => {
                    console.log(error);
                });
        },
        updateRangeDatePastPresent(period, number) {
            this.updateHistoryRangeDate(moment().subtract(period, number).unix(), 0);
        },
        updateRangeDateGetAll() {
            this.updateHistoryRangeDate(0, 0);
        },
    },
    mounted() {
        this.initOneMonthHistory();
        console.log(this.$route);
    }
}
</script>



