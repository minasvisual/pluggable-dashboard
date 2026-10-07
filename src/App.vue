<template>
  <section>
    <CModal :show.sync="loader.global" :closeOnBackdrop="false" size="sm" addContentClasses="loader" :centered="true">
      <template #header-wrapper><span></span></template>
      <template #footer-wrapper><span></span></template>
      <template #body-wrapper>
            <CSpinner color="white" />
      </template>
    </CModal>
    <router-view></router-view>
  </section>
</template>

<script>
import { mapState } from 'vuex'
import AuthMixin from './services/auth.mixin'
export default {
  name: 'App',
  mixins: [AuthMixin],
  computed:{
    ...mapState({
      loader: (state) => state.loading
    })
  },
  beforeMount(){
    // global session check only exists when the dashboard login is enabled
    if( this.hasAuth ) this.isLogged()
  }
}
</script>
<style src="@coreui/coreui/dist/css/coreui.css"></style>
<style lang="scss">
.loader{
  width: auto;
  margin:auto;
  background: transparent !important;
  border: none;
}

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

