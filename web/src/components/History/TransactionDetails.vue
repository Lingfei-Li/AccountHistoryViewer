<template>
    <div id="transactionDetails">
        <div class="container">
            <div v-for="t in transactionDetailsData">
                {{ t.description }}
                {{ t.amount }}
            </div>
        </div>
    </div>
</template>


<script>


export default {
    name: 'transactionDetails',
    props: {
        transactionDetailsData: {
            type: Array
        }
    },
    data () {
        return {

        }
    },
    watch: {
        transactionDetailsData: function(newVal, oldVal) {
            console.log("Details view data updated");
        }
    },
    methods: {

    },
    mounted() {
        console.log(this.transactionDetailsData)
//        this.initChart();
    }
}
</script>



