<template >
  <Loading target="widgets">
    <p v-if="error" class="text-center">{{ error }}</p> 
    <div class="row" v-if="schemas && schemas.length > 0">
      <Base v-for="(item, k) of schemas" :key="k" :schema="item" />
    </div>
  </Loading>
</template>

<script>
import { mapState } from 'vuex'
import { request, sessionFor } from '../../services/models'
import { getErrorMessage } from '../../services/helpers'
import Base from './base'
import Loading from '../../containers/Loading.vue'

export default {
  components:{
    Base, Loading
  },
  data() {
    return {
      error: null,
      schemas:[]
    }
  },
  watch:{
    async current(newProject, oldProject){
        if( newProject && newProject != oldProject )
          await this.loadWidgets()
    }
  },
  computed:{ 
    ...mapState({
      loading: state => state.loading
    }),
    current(){
      return this.$store.state.currentProject || {}
    },
    widgets(){
      return Object.values( this.current.widgets || {} )
    }
  },
  methods:{
    async loadWidgets(){
      try{
        if( !this.widgets ) return false;
        
        this.$store.commit('setLoader', ['widgets', true])
        for(let row of this.widgets){
          if( row.resource ){
            let data = await request(this.current.resources_path + row.resource, {}, { session: sessionFor() })
            if( !data.widgets ) return this.$message("Error to load widget resource");

            this.schemas.push(data)
          }
        }
      }catch(e){
        this.error = getErrorMessage(e)
      }finally{
        this.$store.commit('setLoader', ['widgets', false])
      }
    }
  },
  async mounted(){
    try{
      await this.loadWidgets()
    }catch(e){
      this.error = getErrorMessage(e)
    }
  }
}
</script>