<template>
    <div id="app">
        <navbar></navbar>
        <history-root></history-root>
    </div>
</template>

<script>
import navbar from './components/Navbar.vue';
import historyRoot from './components/HistoryRoot.vue';

export default {
    name: 'app',
    components: {
        navbar,
        historyRoot
    },
    data () {
        return {
          msg: 'Welcome to Your Vue.js App'
        }
    }
}
</script>

<style>
#app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    /*margin-top: 60px;*/
}

h1, h2 {
    font-weight: normal;
}

ul {
    list-style-type: none;
    padding: 0;
}

li {
    display: inline-block;
    margin: 0 10px;
}

a {
    color: #42b983;
}

.banner{
    width: 300px;
}

.navbarImg {
    height: 50px;
    width: 50px;
}
</style>
