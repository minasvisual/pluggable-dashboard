<template>
  <section v-if="formopen">
    <div class="row">
      <div class="col">
        <CButton @click="loadForm">
          <CIcon name="cil-reload" />
        </CButton>
      </div>
    </div>
     <Forms  
        :formopen="formopen"
        :schema="schema" 
        :data="row"
        @model:saved="formHook"
        @close="closeForm"
      /> 
  </section>
</template>


<script>
import { has, get, set } from 'lodash'
import ControllerMixin from '../../../services/controller.mixin'
import SessionMixin from '../../../services/session.mixin'
 
import Forms  from '../formulate'
export default {
  mixins:[ControllerMixin, SessionMixin],
  components: { Forms },
  props:{
    context: {
      type: Object,
      default: () => ({})
    }
  }, 
  data(){
    return{ 
      row:{}, 
      formopen: false,
    }
  },
  computed:{
    formTitle(){ 
      return this.row && this.row.id ? `Update ${this.schema.title} | ID: ${this.row.id}`: `New ${this.schema.title}`
    },
    formValues(){
      return this.$store.state.crud.row || {}
    },
  },
  methods:{
    loadForm(){
      try{
        this.schema.api.bypassGetDataById = true
        this.getData(this.schema, {}).then( (data) => {
            this.row = data
            this.formopen = true
        })
      }catch(err){
        this.$alert('Form error', err)
      }
    },
    async formHook(data){
      try{
        return await this.saveData(this.schema, data)
          .then((res) => {
              this.closeForm({ refresh: true })
              return res
          })
      }catch(err){
        this.$alert('Form submit error', err)
      }
    },
    closeForm({ refresh }){  
        this.formopen = false;
        this.loadForm()
        this.$store.commit('set', ['crud', {...this.crud, row: null }] )
    },
  },
  async mounted(){
    await this.loadForm()
  }
}
</script>