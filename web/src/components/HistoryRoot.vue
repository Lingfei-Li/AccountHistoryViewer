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
        processRawTransactionData(transactionData) {
            this.$store.state.transactionData = transactionData;
            console.log(this.$store.state.transactionData);

            this.$store.state.transactionData = this.$store.state.transactionData.map(h => {
                h['TransactionDateTime'] = toMomentDateTime(h['TransactionDateSec']);
                return h;
            });
        },
        initOneMonthHistory() {
            let startDateSec = moment().subtract(1, 'months').unix();
            axios.get(`${config.api.transactions}/${startDateSec}/0`)
                .then(response => {
                    console.log(response.data);
                    console.log(response.data.transactions);
                    this.processRawTransactionData(response.data.transactions);
                });
        },
        updateHistoryRangeDate(startDateSec, endDateSec) {
            axios.get(`${config.api.transactions}/${startDateSec}/${endDateSec}`)
                .then(response => {
                    console.log(response.data);
                    console.log(response.data.transactions);
                    this.processRawTransactionData(response.data.transactions);
                })
                .catch(error => {
                    console.log(error);
                });
        },
        updateRangeDatePastPresent(period, number) {
            this.title = number + " " + period;
            this.updateHistoryRangeDate(moment().subtract(period, number).unix(), 0);
        },
        updateRangeDateGetAll() {
            axios.get(`${config.api.transactions}`)
                .then(response => {
                    console.log(response.data);
                    console.log(response.data.transactions);
                    this.processRawTransactionData(response.data.transactions);
                })
                .catch(error => {
                    console.log(error);
                });
        },
    },
    mounted() {
        this.initOneMonthHistory();
        console.log(this.$route);
    }
}
</script>



