<template>
    <div class="row" id="filters">
        <div class="col-sm-10 offset-sm-1">
            <div class="card">
                <h3 class="card-header">Filters</h3>
                <div class="card-block">
                    <div v-for="filter in filters" class="row card-text form-inline">
                        <div class="col-sm-1">
                            <img v-if="filter.active" src="../../assets/check-mark-1292787_960_720.png" class="filterActiveMark"/>
                        </div>
                        <div class="col-sm-8 form-group">
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
                            <label>
                                <input class="form-control" v-model="filter.value"/>
                            </label>
                        </div>
                        <div class="col-sm-2">
                            <label>
                                <select v-on:change="onAddedCondition($event, filter)" class="form-control">
                                    <option value="" disabled selected> Add Condition </option>
                                    <option value="bool:isCaseSensitive=true"> Case Sensitivity </option>
                                    <option value="string: other=conditions"> Other </option>
                                </select>
                            </label>
                        </div>
                        <div class="col-sm-1">
                            <img src="../../assets/trash.png" class="popFilterButton" v-on:click="filters.pop()" />
                        </div>
                        <div class="row">
                            <div class="col-sm-11 offset-sm-1">
                                <div class="col-sm-4" style="background: grey" v-for="condition in filter.additionalConditions">
                                    {{condition.key}}: <input v-model="condition.value"/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer text-right">
                    <button class="btn btn-secondary" v-on:click="addFilter()">Add Filter</button>
                    <button class="btn btn-secondary" v-on:click="dumpFilter()">Dump Filter</button>
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
    .filterActiveMark {
        display: block;
        margin: 5px auto;
        width: 20px;
        height: 20px;
    }
    .popFilterButton{
        display: block;
        margin: 5px auto;
        width: 30px;
        height: 30px;
        cursor: pointer;
    }
</style>

<script>

import {mapGetters} from 'vuex'
import {v1 as uuid} from 'uuid'

export default {
    name: 'filters',
    computed: mapGetters({
        "filters": "filters"
    }),
    methods: {
        onAddedCondition(event, filter) {
            const conditionString = event.target.value;
            const type = conditionString.split(":")[0],
                  key = conditionString.split(":")[1].split("=")[0],
                  value = conditionString.split(":")[1].split("=")[1];
            this.$store.commit({
                type: "addFilterCondition",
                filterId: filter.id,
                condition: {
                    key,
                    value,
                    type
                }
            });
        },
        addFilter() {
            this.$store.state.filters.push({
                "id": uuid(),
                "key": "description",
                "operator": "contains",
                "value": "",
                "active": false,
                "additionalConditions": []
            });
        },
        applyFilter() {
            this.$store.state.filters.forEach(function(filter) {
                console.log(filter);
                if(filter.key && filter.operator && filter.value) {
                    filter.active = true;
                }
            });
        },
        dumpFilter() {
            this.filters.forEach(function(f) {
                console.log(f);
            });
        }

    },
    mounted() {

    }
}
</script>



