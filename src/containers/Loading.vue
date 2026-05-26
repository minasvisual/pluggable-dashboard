<template>
  <section class="loading-wrap" :class="{ 'active': (loading[target] || show) }">
     <div class="blackdrop"><CSpinner color="info" /></div>
     <slot />
  </section>
</template>

<script> 
import { mapState } from 'vuex'
export default {
  props:['target', 'show'],
  data(){return{ 
  }},
  computed:{
    ...mapState({
      loading: state => state.loading
    }),
  }
}
</script>
<style lang="scss">
.loading-wrap{
 	position: relative;

  .blackdrop{
    display: none;
  }
  &.active{ 
    .blackdrop{
      display: block;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      z-index: 99;
      background: rgba(255, 255, 255, 0.7);
      .spinner-border{
        position: absolute;
        top: 49%;
        left: 49%;
      }
    }
  }
}
</style>