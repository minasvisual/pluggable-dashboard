<template>
  <CFooter :fixed="false">
    <div>
      <a href="https://github.com/minasvisual/pluggable-dashboard" target="_blank">Pluggable Dashboard</a>
      <span class="ml-1">&copy; {{new Date().getFullYear()}}.</span>
    </div>
    <div class="ml-auto">
      <span class="mr-1">Powered by</span>
      <a href="https://coreui.io/vue" target="_blank">CoreUI for Vue</a>
    </div>
  </CFooter>
</template>

<script>
export default {
  name: 'TheFooter'
}
</script>

<style lang="scss">
@media (max-width: 728px) {
  .c-footer{
    font-size: 10px;
  }
}
</style>