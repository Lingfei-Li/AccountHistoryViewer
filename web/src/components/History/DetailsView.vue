<template>
    <div class="row" id="detailsView">
        <div class="col-sm-10 offset-sm-1">
            <div class="card">
                <h3 class="card-header">Details</h3>
                <div class="card-block">
                    <div>
                        {{ transaction.description }}
                    </div>
                    <div>
                        {{ transaction.amount }}
                    </div>
                    <div>
                        {{ transaction.type }}
                    </div>
                    <div>
                        {{ transaction.transaction_datetime }}
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



