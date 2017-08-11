import axios from 'axios';

var app = new Vue({
   el: '#app',
   data: {
       message: 'Hello Vue!'
   }
   // ,
   // mounted() {
   //     axios.get("https://a7996ss0v9.execute-api.us-west-2.amazonaws.com/dev/history")
   //         .then(response => {
   //             this.message = response.data.history[0].amount;
   //         });
   // }
});
