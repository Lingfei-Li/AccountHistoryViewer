<template>
    <div class="row" id="detailsView">
        <div class="col-sm-10 offset-sm-1">
            <div class="card">
                <h3 class="card-header">Details</h3>
                <div class="card-block">
                    <div>
                        {{ transaction['Description'] }}
                    </div>
                    <div>
                        {{ transaction['Amount'] }}
                    </div>
                    <div>
                        {{ transaction['TransactionType'] }}
                    </div>
                    <div>
                        {{ transaction['TransactionDateTime'] }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
    #detailsView {
        margin-top: 20px;
        text-align: center;
    }
</style>

<script>


export default {
    name: 'detailsView',
    props: {
        transaction: {
            type: Object
        }
    },
    data () {
        return {

        }
    },
    watch: {
        transaction: function(newVal, oldVal) {
            console.log("Details view data updated");
        }
    },
    methods: {

    },
    mounted() {
        console.log(this.transaction)
    }
}
</script>



