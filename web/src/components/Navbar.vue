<template>
    <div id="navbar">
    <nav class="navbar navbar-toggleable-md navbar-light bg-faded">
        <a class="navbar-brand" href="#">
            <img src="../assets/navbarImg.jpg" width="30" height="30" class="d-inline-block align-top" alt="" />
            Project Erebor
        </a>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item active">
                    <a class="nav-link" href="#">Dashboard</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#">What's next</a>
                </li>
            </ul>
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

