<template>
    <div id="chart">
        <div class="container">
            <div v-bind:style="chartStyle" id="chartContainer" ></div>
            <h3>{{note}}</h3>
        </div>
    </div>
</template>

<script>


function makeBalanceData(transactions) {
    if(transactions.length <= 0) return [];
    let transactionsCopy = transactions.slice(0);    // Make a clone of history array
    // Sort transaction by date
    transactionsCopy.sort((a, b) => {
        return a.transaction_date_sec - b.transaction_date_sec;
    });
    let curBal= 0.0;
    let curDatetime = transactionsCopy[0].transaction_datetime;
    let balanceData= [];
    let transactionPerDay = [];
    transactionsCopy.forEach(h => {
        if(!h.transaction_datetime.isSame(curDatetime)) {
            balanceData.push({x: curDatetime.toDate(), y: curBal, toolTip: makeToolTip(transactionPerDay, curDatetime), account: h.account});

            curDatetime = h.transaction_datetime;
            transactionPerDay = [];
        }
        curBal += parseFloat(h.amount.replace('−', '-'));
        transactionPerDay.push(h);
    });
    balanceData.push({x: curDatetime.toDate(), y: curBal, toolTip: makeToolTip(transactionPerDay, curDatetime),
        account: transactionsCopy[transactionsCopy.length-1].account});
    return balanceData;
}

function makeToolTip(historyList, cur_datetime) {
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
        const str = "<br/><a href='#{2}' title='{1}'>{0}</a>"
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
}

export default {
    name: 'chart',
    props: {
        transactionData: {
            type: Array
        }
    },
    data () {
        return {
            chartStyle: {
                height: "300px",
                width: "100%",
                display: "block"
            },
            balanceData: [123, 456],
            chart: {},
            note: ""
        }
    },
    watch: {
        transactionData: function() {
            if(this.transactionData.length === 0) {
                this.note = "No Data Available";
            }
            else {
                this.note = this.transactionData.length + " transactions";
            }
            this.balanceData = makeBalanceData(this.transactionData);
            this.chart.options.data[0].dataPoints = this.balanceData;
            this.chart.render();
        }
    },
    methods: {
        initChart: function() {
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
                        dataPoints: []
                    }
                ]
            });
           this.chart.render();
        }
    },
    mounted() {
        this.initChart();
    }
}
</script>



