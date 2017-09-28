<template>
    <div id="dashboard">
        <navbar></navbar>
        <historyRoot></historyRoot>
    </div>
</template>

<script>
import navbar from './Navbar.vue';
import historyRoot from './HistoryRoot.vue';

export default {
    name: 'dashboard',
    components: {
        historyRoot,
        navbar
    },
    data () {
        return {}
    }
}
</script>



