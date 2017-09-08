<template>
    <div id="chart">
        <div class="container">
            <div id="chartContainer" style="height: 300px; width: 100%;"></div>
        </div>
        <div>
            <button v-bind:class="['btn', isView[0]]" v-on:click="updateRangeDatePastPresent('w', 1); setActiveButton('w');">1 Week</button>
            <button v-bind:class="['btn', isView[1]]" v-on:click="updateRangeDatePastPresent('M', 1); setActiveButton('m');">1 Month</button>
            <button v-bind:class="['btn', isView[2]]" v-on:click="updateRangeDatePastPresent('Q', 1); setActiveButton('q');">1 Quarter</button>
            <button v-bind:class="['btn', isView[3]]" v-on:click="updateRangeDatePastPresent('M', 6); setActiveButton('hy');">1/2 Year</button>
            <button v-bind:class="['btn', isView[4]]" v-on:click="updateRangeDatePastPresent('y', 1); setActiveButton('y');">1 Year</button>
            <button v-bind:class="['btn', isView[5]]" v-on:click="updateRangeDateGetAll()">All History</button>
        </div>
    </div>
</template>


<script>
import axios from 'axios';
import moment from 'moment';
import config from '../config';

export default {
    name: 'chart',
    data () {
        return {
            historyStartDate: "",
            historyEndDate: "",
            newHistoryStartDate: "1/1/2016",
            newHistoryEndDate: "1/1/2017",
            isView: ['btn-default', 'btn-default', 'btn-default', 'btn-default', 'btn-default', 'btn-default']
        }
    },
    methods: {
        makeBalanceHistory: function(history) {
            if(history.length <= 0) return [];
            let cur_bal = 0.0;
            let cur_datetime = history[0].transaction_datetime;
            let balance_history = [];
            let history_per_day = [];
            history.forEach(h => {
                if(!h.transaction_datetime.isSame(cur_datetime)) {
                    balance_history.push({x: cur_datetime.toDate(), y: cur_bal, toolTip: this.makeToolTip(history_per_day, cur_datetime), account: history.account});
                    cur_datetime = h.transaction_datetime;
                    history_per_day = [];
                }
                cur_bal += parseFloat(h.amount.replace('−', '-'));
                history_per_day.push(h);
            });
            balance_history.push({x: cur_datetime.toDate(), y: cur_bal, toolTip: this.makeToolTip(history_per_day, cur_datetime), account: history.account});
            return balance_history;
        },
        toMomentDateTime: function(sec) {
            // noinspection JSUnresolvedVariable, JSUnresolvedFunction
            return moment.unix(sec);
        },
        makeToolTip: function(historyList, cur_datetime) {
            if (!String.prototype.format) {
                String.prototype.format = function() {
                    let args = arguments;
                    return this.replace(/{(\d+)}/g, function(match, number) {
                        return typeof args[number] !== 'undefined'
                            ? args[number]
                            : match
                            ;
                    });
                };
            }

            let toolTipContent = {"checking": "", 'savings': '', 'others': ''};
            historyList.forEach((h) => {
                const str = "<br/><a href='#{2}' onclick='toolTipClick()' title='{1}'>{0}</a>"
                    .format(h.amount, h.description, h.id);
                if(h.account === 'checking' || h.account === 'savings') {
                    toolTipContent[h.account] += str;
                }
                else {
                    toolTipContent['others'] += str;
                }
            });
            let result = `<b>${cur_datetime.format("YYYY-M-D")}</b><br/>`;
            if(toolTipContent['checking'] !== '') {
                result += '<b>Checking:</b>' + toolTipContent['checking'];
            }
            if(toolTipContent['savings'] !== '') {
                if(result !== '') {
                    result += '<br/>';
                }
                result += '<b>Savings:</b>' + toolTipContent['savings'];
            }
            if(toolTipContent['others'] !== '') {
                if(result !== '') {
                    result += '<br/>';
                }
                result += '<b>Others:</b>' + toolTipContent['others'];
            }
            return result;
        },
        initOneMonthHistory() {
            let startDateSec = moment().subtract(1, 'months').unix();
            axios.get(`${config.api.historyRoot}/${startDateSec}/0`)
                .then(response => {
                    this.history = response.data.history;

                    // Make chart
                    this.history = this.history.map(h => {
                        // noinspection JSUnresolvedVariable
                        h.transaction_datetime = this.toMomentDateTime(parseInt(h.transaction_date_sec));
                        return h;
                    });
                    this.history.sort((a, b) => {
                        // noinspection JSUnresolvedVariable
                        return a.transaction_date_sec - b.transaction_date_sec;
                    });
                    this.balance_history = this.makeBalanceHistory(this.history);

                    // Transaction List
                    this.history.sort((a, b) => {
                        // noinspection JSUnresolvedVariable
                        return b.transaction_date_sec - a.transaction_date_sec;
                    });

                    this.chart = new CanvasJS.Chart("chartContainer", {
                        title:{
                            text: ""
                        },
                        axisX: {
                            valueFormatString: "MMM",
                            interval:1,
                            intervalType: "month"
                        },
                        data: [
                            {
                                type: "line",
                                toolTipContent: "{toolTip}",
                                dataPoints: this.balance_history
                            }
                        ]
                    });
                    this.chart.render();
                });
        },
        updateHistoryRangeDate(startDateSec, endDateSec) {
            axios.get(`${config.api.historyRoot}/${startDateSec}/${endDateSec}`)
                .then(response => {
                    this.history = response.data.history;

                    // Make chart
                    this.history = this.history.map(h => {
                        // noinspection JSUnresolvedVariable
                        h.transaction_datetime = this.toMomentDateTime(parseInt(h.transaction_date_sec));
                        return h;
                    });
                    this.history.sort((a, b) => {
                        // noinspection JSUnresolvedVariable
                        return a.transaction_date_sec - b.transaction_date_sec;
                    });
                    this.balance_history = this.makeBalanceHistory(this.history);

                    // Transaction List
                    this.history.sort((a, b) => {
                        // noinspection JSUnresolvedVariable
                        return b.transaction_date_sec - a.transaction_date_sec;
                    });

                    console.log('updating data...');
                    this.chart.options.data[0].dataPoints = this.balance_history;
                    this.chart.render();

                })
                .catch(error => {
                    console.log(error);
                });
        },
        setActiveButton(period) {
            switch(period) {
                case 'd':
                    this.isView[0] = 'btn-primary';
                    break;
                case 'w':
                    this.isView[1] = 'btn-primary';
                    break;
                case 'm':
                    this.isView[2] = 'btn-primary';
                    break;
                case 'q':
                    this.isView[3] = 'btn-primary';
                    break;
                case 'hy':
                    this.isView[4] = 'btn-primary';
                    break;
                case 'y':
                    this.isView[5] = 'btn-primary';
                    break;
            }

        },
        updateRangeDatePastPresent(period, number) {
            this.updateHistoryRangeDate(moment().subtract(period, number).unix(), 0);
        },
        updateRangeDateGetAll() {
            this.updateHistoryRangeDate(0, 0);
        },
        updateRangeDate() {
            this.historyStartDate = this.newHistoryStartDate;
            this.historyEndDate = this.newHistoryEndDate;
            let historyStartDateSec = moment(this.historyStartDate, "MM/DD/YYYY").unix();
            let historyEndDateSec = moment(this.historyEndDate, "MM/DD/YYYY").unix();

            console.log(`date range changed: ${historyStartDateSec} - ${historyEndDateSec}`);
            this.updateHistoryRangeDate(historyStartDateSec, historyEndDateSec);
        }
    },
    mounted() {
        this.initOneMonthHistory();
    }
}
</script>



