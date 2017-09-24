<template>
    <div id="historyRoot">
        <div>
            {{ transactionData.length }}
        </div>
        <chart v-bind:transactionData="this.transactionData"></chart>
        <div>
            <button class="btn btn-default" v-on:click="updateRangeDatePastPresent('w', 1);">1 Week</button>
            <button class="btn btn-default" v-on:click="updateRangeDatePastPresent('M', 1);">1 Month</button>
            <button class="btn btn-default" v-on:click="updateRangeDatePastPresent('Q', 1);">1 Quarter</button>
            <button class="btn btn-default" v-on:click="updateRangeDatePastPresent('M', 6);">1/2 Year</button>
            <button class="btn btn-default" v-on:click="updateRangeDatePastPresent('y', 1);">1 Year</button>
            <button class="btn btn-default" v-on:click="updateRangeDateGetAll()">All History</button>
        </div>
    </div>
</template>

<script>
import axios from 'axios';
import moment from 'moment';
import config from '../config';

import chart from './History/Chart.vue';

function toMomentDateTime(sec) {
    return moment.unix(sec);
}

export default {
    name: 'history-root',
    components: {
        chart
    },
    data () {
        return {
            transactionData: [],
            balanceData: []
        }
    },
    methods: {
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
    }
}
</script>



