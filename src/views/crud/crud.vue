<template>
  <section>
    <Table 
      ref="tables" 
      v-if="schema.api"
      :schema="schema"
      :layout="layout"
      :resource="resource"
      @actions:create="actions('FORM_CREATE', $event)"
      @actions:edit="actions('FORM_EDIT', $event)"
      @actions:delete="actions('FORM_DELETE', $event)"
      @actions:deleteBatch="actions('FORM_DELETEBATCH', $event)" 
    />

    <CModal
      :title="formTitle"
      :show.sync="formopen"
      size="lg"
      :closeOnBackdrop="false"
    >
        <Forms 
          v-if="formopen"
          :schema="schema" 
          :data="row"
          @model:saved="formHook"
          @close="closeForm"
        /> 
        <template slot="footer"><span></span></template>
    </CModal>
    
    <CModal 
      title="Schema Viewer"
      v-if="action.show"
      :show.sync="action.show"
      size="lg"
      :closeOnBackdrop="false"
    >
        <Crud 
          v-if="action.type == 'modal:grid'"
          :context="action"
        />
        <Forms 
          v-else-if="action.type = 'modal:form'"
          :schema="action.schema"
          :data="action.row"
          :save="true"
          @close="action = {}"
        /> 
        <template slot="footer"><span></span></template>
    </CModal>
  </section>
</template>

<script>
import ControllerMixin from '../../services/controller.mixin'
import SessionMixin from '../../services/session.mixin'
import ActionsMixin from '../../services/actions.mixin'

import { getErrorMessage } from '../../services/helpers'
import Table from './table'
import Forms  from './formulate'
export default {
  name: "GridBase",
  mixins:[ControllerMixin, SessionMixin, ActionsMixin],
  components: { Table, Forms },
  props:{
    schema: {
      type: Object,
      default: () => ({})
    },
    resource: { 
      default:() => [] 
    },
    layout:{
      type: String
    }
  }, 
  data(){
    return{
      models: {},
      row:{},
      formopen:false,
      formLogin:true,  
    }
  },
  computed:{
    formTitle(){ 
      return this.row && this.row.id ? `Update ${this.schema.title} | ID: ${this.row.id}`: `New ${this.schema.title}`
    },
    crud(){
      return this.$store.state.crud || {}
    }
  },
  methods:{
    reloadData() {
      this.$refs.tables.fetchData({ type: "pageChange" });
      this.formopen = false;
    },
    closeForm({ refresh }){
        if( refresh )
          this.reloadData()
          
        this.formopen = false;
        this.$store.commit('set', ['crud', {...this.crud, row: null }] )
    },
    actions(action, data){
      console.debug("table actions received", action, data)
      if( action == 'FORM_CREATE'){
        this.row = {}
        this.$store.commit('set', ['crud', {...this.crud, row: {} }] )
        this.formopen = true;
      }else if(action == 'FORM_EDIT'){
        this.row = { ...data }
        this.$store.commit('set', ['crud', {...this.crud, row: this.row }] )
        this.formopen = true;
      }else if(action == 'FORM_DELETE'){
          this.deleteData(this.schema, data).then(() => {
            this.$message('Successfully deleted!')
            this.reloadData()
          })
      }else if(action == 'FORM_DELETEBATCH'){
          let proms = data && data.map(i => this.deleteData(this.schema, i))
          
          Promise.all(proms)
              .catch( err => this.$message(err.message, 'danger'))
              .then( res => {
                this.$message('All rows delete successfully')
                this.reloadData()
              })
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
        console.debug('Form submit error', err)
        this.$message(getErrorMessage(err), 'danger')
      }
    },
    loadActions(){
      this.$bus.$on(`${this.schema.domain}:save`, this.formHook);
      this.$bus.$on(`${this.schema.domain}:delete`, function(data) {
        this.actions('FORM_DELETE', data) 
      });
      this.$bus.$on("model:redirect", this.redirect)
      this.$bus.$on("model:grid", this.openModel)
      this.$bus.$on("model:form", this.openForm)
    },
    destroyActions(){
      this.$bus.$off(`${this.schema.domain}:save`, this.formHook);
      this.$bus.$off(`${this.schema.domain}:delete`, function(data) {
        this.actions('FORM_DELETE', data) 
      });
      this.$bus.$off("model:redirect", this.redirect)
      this.$bus.$off("model:grid", this.openModel)
      this.$bus.$off("model:form", this.openForm)
    }
  },
  mounted(){
    console.debug("Iniciado CrudVue", this.schema)
    this.loadActions()
  }, 
  beforeDestroy() {
    this.destroyActions()
  },
}
</script>