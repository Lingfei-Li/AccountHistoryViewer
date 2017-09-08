<template>
    <div id="app">
        <navbar></navbar>
        <img src="http://az616578.vo.msecnd.net/files/2016/10/08/63611544510437076964939708_636016045463548403-1141137312_635935160236280609575526844_lottery-winner-money-stock-today-tease-160108_bf238d3c03a7005a50a6d6274d46083f.jpg">
        <chart></chart>
    </div>
</template>

<script>
import navbar from './components/Navbar.vue';
import chart from './components/Chart.vue';

export default {
    name: 'app',
    components: {
        navbar,
        chart
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

img {
    height: 300px;

}
</style>
