<template>
    <div class="row" id="filters">
        <div class="col-sm-10 offset-sm-1">
            <div class="card">
                <h3 class="card-header">Filters</h3>
                <div class="form-control">
                    <div v-for="filter in filters" >
                        <label>
                            <input class="form-control" v-model="filter.key"/>
                        </label>
                        <label>
                            <input class="form-control" v-model="filter.operator"/>
                        </label>
                        <label>
                            <input class="form-control" v-model="filter.value"/>
                        </label>
                        <button class="btn btn-link" v-on:click="filters.pop()">Remove</button>
                    </div>
                    <button class="btn btn-secondary" v-on:click="addFilter()">Add Filter</button>
                    <button class="btn btn-primary" v-if="filters.length !== 0" v-on:click="applyFilter()">Apply Filter</button>
                </div>
                <detailsView v-bind:transaction="this.detailedTransaction"></detailsView>
            </div>
        </div>
    </div>
</template>

<style>
    #filters {
        margin-top: 20px;
    }
</style>

<script>
export default {
    name: 'filters',
    components: {

    },
    data () {
        return {
            filters: []
        }
    },
    methods: {
        addFilter() {
            this.filters.push({
                "key": "",
                "operator": "",
                "value": ""
            });
        }
    },
    mounted() {

    }
}
</script>



