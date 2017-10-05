<template>
    <div id="detailsView">
        <h4>Details</h4>
        <div class="container">
            <div>
                {{ transaction.description }}
            </div>
            <div>
                {{ transaction.amount }}
            </div>
        </div>
    </div>
</template>


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



