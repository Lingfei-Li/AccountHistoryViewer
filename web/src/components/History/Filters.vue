<template>
    <div class="row" id="filters">
        <div class="col-sm-10 offset-sm-1">
            <div class="card">
                <h3 class="card-header">Filters</h3>
                <div class="form-control">
                    <div v-for="filter in filters" class="row">
                        <div class="col-sm-4">
                            <label>
                                <select v-model="filter.key" class="form-control">
                                    <option value="description">Description</option>
                                    <option value="type">Type</option>
                                    <option value="amount">Amount</option>
                                    <option value="transactiondate">Transaction Date</option>
                                    <option value="bank">Bank</option>
                                    <option value="contains"> contains </option>
                                </select>
                            </label>
                        </div>
                        <div class="col-sm-3">
                            <label>
                                <select v-model="filter.operator" class="form-control">
                                    <option value="contains"> contains </option>
                                    <option value="<" v-if="filter.key === 'amount'"> < </option>
                                    <option value=">" v-if="filter.key === 'amount'"> > </option>
                                    <option value="<=" v-if="filter.key === 'amount'"> <= </option>
                                    <option value=">=" v-if="filter.key === 'amount'"> >= </option>
                                    <option value="="> = </option>
                                </select>
                            </label>
                        </div>
                        <div class="col-sm-3">
                            <label>
                                <input class="form-control" v-model="filter.value"/>
                            </label>
                        </div>
                        <div class="col-sm-2">
                            <label>
                                <div class="form-control">{{filter.active}}</div>
                            </label>
                        </div>
                        <div class="col-sm-1">
                            <button class="btn btn-secondary" v-on:click="filters.pop()">X</button>
                        </div>
                    </div>
                    <button class="btn btn-secondary" v-on:click="addFilter()">Add Filter</button>
                    <button class="btn btn-primary" v-if="filters.length !== 0" v-on:click="applyFilter()">Apply Filter</button>
                </div>
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
    computed: {
        filters() {
            return this.$store.state.filters;
        }
    },
    methods: {
        addFilter() {
            this.$store.state.filters.push({
                "key": "",
                "operator": "",
                "value": "",
                "active": false
            });
        },
        applyFilter() {
            this.$store.state.filters.forEach(function(filter) {
                console.log(filter);
                if(filter.key && filter.operator && filter.value) {
                    filter.active = true;
                }
            });
        }
    },
    mounted() {

    }
}
</script>



