<template>
  <div id="navbar">
      <nav class="navbar navbar-default">
          <div class="navbar-header">
            <a class="navbar-brand" href="#">{{ siteName }}</a>
          </div>
      </nav>
  </div>
</template>

<script>
export default {
    name: 'navbar',
    data () {
        return {
          siteName: '$$$'
        }
    }
}
</script>

