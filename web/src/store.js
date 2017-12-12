import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        transactionData: [],
        totalBalanceForFirstDate: 0,
        filters: []
    },
    mutations: {
        addFilterCondition(state, payload) {
            const filter = state.filters.find(function(f) {
                return f.id === payload.filterId;
            });
            // Use Vue.set() to add new attributes to object to update state correctly
            // Vue.set(filter.additionalConditions, payload.condition.name, payload.condition.value);
            const key= payload.condition.key,
                  value = payload.condition.value;
            filter.additionalConditions.push({key, value});
        }
    },
    getters: {
        filters: function(state) {
            return state.filters;
        },
        filteredTransactionData: function(state) {
            let filters = state.filters;
            return state.transactionData.filter(function(transaction) {
                let eligible = true;
                filters.filter(f => f.active).forEach(function(filter) {
                    switch(filter.operator.trim()) {
                        case "contains":
                            eligible &= String(transaction[filter.key]).indexOf(filter.value) !== -1;
                            break;
                        case "<":
                            eligible &= filter.key === "amount" && transaction['amount'] < filter.value;
                            break;
                        case ">":
                            eligible &= filter.key === "amount" && transaction['amount'] > filter.value;
                            break;
                        case "<=":
                            eligible &= filter.key === "amount" && transaction['amount'] <= filter.value;
                            break;
                        case ">=":
                            eligible &= filter.key === "amount" && transaction['amount'] >= filter.value;
                            break;
                        case "=":
                        case "==":
                            eligible &= String(transaction[filter.key]) === filter.value !== -1;
                            break;
                        default:
                            break;
                    }
                });
                return eligible;
            });
        }
    }
});
