<template>
  <div>
    <CCard>
      <CCardHeader>
          <CIcon name="cil-drop"/> 
          <span>  Playground</span>
          
          <div class="card-header-actions" >
            <!-- <select v-model="project" >
              <option :value="null" selected readonly>Select model</option>
              <option v-for="row of optionfy(projects, 'name', 'code')" :key="row.value" :value="row.value" v-text="row.label"></option>
            </select> -->

            <select v-if="currentProject" v-model="model">
              <option v-for="row of optionfy(models, 'label', 'resource')" :key="row.value" :value="row.value" v-text="row.label"></option>
            </select>

            <CButton type="button" @click="reloadProjects"><CIcon name="cil-reload" /> Projects</CButton>
          </div>
      </CCardHeader>
      <CCardBody>
        <CRow>
          <CCol lg="7"> 
            <CButton class="float-right" @click="forceRerender"><CIcon name="cil-reload" /> Update View</CButton>
          
                <CTabs variant="pills" :active-tab="0"> 
                  <CTab title="Form" v-if="active && active.type !== 'form'">
                      <Auth
                          v-if="currentProject && active" 
                          :project="currentProject" 
                          :schema="active"
                          @auth:logged="auth"
                          @auth:failed="errors"
                      >
                        <template v-slot="{ schema }">
                          <Forms 
                            v-if="schema.properties && render"
                            :schema="schema"
                            :data="row"
                            @model:saved="submitHandler"
                          /> 
                        </template>
                      </Auth>        
                  </CTab>

                  <CTab title="Grid" v-if="active"> 
                     <Auth
                          v-if="currentProject && active" 
                          :project="currentProject" 
                          :schema="active"
                          @auth:logged="auth"
                          @auth:failed="errors"
                      >
                        <template v-slot="{ schema }">
                           <Form   
                              v-if="schema.api && render && schema.type == 'form'"
                              :schema="schema"   
                            />  
                          <Table 
                            ref="tables" 
                            v-else-if="schema.api && render"
                            :schema="schema"
                            :layout="schema.layout || layout"
                            @actions:create="actionsTable('FORM_CREATE', $event)"
                            @actions:edit="actionsTable('FORM_EDIT', $event)"
                          /> 
                        </template>
                     </Auth>
                  </CTab>

                  <CTab title="Widget"> 
                    <div class="mt-4 d-flex justify-content-between" > 
                      <select v-model="widgetSource">
                        <option :value="''">Select to set schema</option>
                        <option v-for="(row, k) of widgets" :key="k" :value="row" v-text="row.label"></option>
                      </select>
                      <CButton type="button" @click="$refs.widget.loadWidget({ cache: {ignoreCache: true} })">
                          <CIcon name="cil-reload" /> Reload Widget
                      </CButton>
                    </div>
                    <Widget ref="widget" v-if="widget.api" :schema="widget" />
                  </CTab>
                  
                </CTabs>
          </CCol>
          <CCol lg="5" style="min-height: 500px">
            <select v-model="jsonEditorData">
              <option value="project">Project</option>
              <option value="model">Model</option>
              <option value="row">Form values</option>
              <option value="result">Result</option>
              <option value="widget">widget</option>
            </select>
            <CButton type="button" @click="newJson(jsonEditorData)"><CIcon name="cil-plus" /> New {{ jsonEditorData }}</CButton>

            <!-- <VJsoneditor v-if="jsonEditorData == 'projects'" v-model="projects" height="100%" :options="{mode: 'code'}" ></VJsoneditor> -->
            <VJsoneditor v-if="jsonEditorData == 'project'" v-model="currentProject" height="100%" :options="{mode: 'code'}" ></VJsoneditor>
            <VJsoneditor v-else-if="jsonEditorData == 'model'" v-model="active" height="100%" :options="{mode: 'code'}" ></VJsoneditor>
            <VJsoneditor v-else-if="jsonEditorData == 'row'" v-model="row" height="100%" :options="{mode: 'code'}" ></VJsoneditor>
            <VJsoneditor v-else-if="jsonEditorData == 'result'" v-model="submit" height="100%" :options="{mode: 'code'}" ></VJsoneditor>
            <VJsoneditor v-else-if="jsonEditorData == 'widget'" v-model="widget" height="100%" :options="{mode: 'code'}" ></VJsoneditor>
          </CCol>
        </CRow>
        
      </CCardBody>
    </CCard>

    <CModal
      title="New item"
      :show.sync="addModal.show"
      size="lg"
      :closeOnBackdrop="false"
    >
      <NewProject v-if="addModal.type == 'project'" />
      <NewModel v-if="addModal.type == 'model'" @model="(data) => this.active = data"/>
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
          @model:saved="submitHandler"
          @close="() => action = {}"
        /> 
        <template slot="footer"><span></span></template>
    </CModal>
  </div>
</template>

<script>
import ControllerMixin from '../../services/controller.mixin'
import SessionMixin from '../../services/session.mixin'
import Actions from '../../services/actions.mixin'

import { loadProjects, request } from '../../services/models'
import { get } from 'lodash'
import VJsoneditor from 'v-jsoneditor'
import Auth from '../crud/auth'
import Table from '../crud/table'
import Forms from '../crud/formulate'
import Form from '../crud/form'
import Widget from '../widgets/base'

import NewProject from './playgrounds/NewProject'
import NewModel from './playgrounds/NewModel'

export default {
  mixins:[ControllerMixin, SessionMixin, Actions],
  components: { VJsoneditor, Forms, Table, Auth, NewProject, NewModel, Widget, Form },
  data(){return{
    render: true,
    jsonEditorData: 'project',
    project: null,
    model: null,
    active: null,
    row: { },
    submit: {},
    addModal: {},
    widget: {},
    widgetSource:null,
    layout: "table",
    action: { show: false }
  }},
  watch:{
    currentProject(newVal, oldVal){
      if( newVal )
        this.forceRerender()
    },
    widgetSource(newVal){
      if( newVal )
        this.getWidget(newVal)
        this.forceRerender()
    },
    model(newVal){
      if( newVal )
        this.getModel(newVal)
        this.forceRerender()
    },
    row(val){
      this.$store.commit('set', ['crud', {...this.crud, row: val}])
    }
  },
  computed:{
    models(){
      return Object.values( get(this.currentProject, 'resources', {}) )
    },
    widgets(){
      return Object.values( get(this.currentProject, 'widgets', {}) )
    },
    hasAuth(){ 
      return this.currentProject && !!this.currentProject.auth 
    },  
    crud(){
      return this.$store.state.crud || {}
    }
  },
  methods:{
    actionsTable(action, data){
      console.debug('action table', data)
      this.row = data
      this.$message("Row added to form values")
    },
    getModel(model){
      return request(this.currentProject.resources_path + model, { cache:{ ignoreCache: true } })
        .then((data) => {
          if( !data.api ) return alert("Model load error")

          this.active = data
          this.$store.commit('set', ['crud', {...this.crud, row: this.row}])
          
          this.loadActions()
        })
    },
    getWidget(model){
      return request(this.currentProject.resources_path + model.resource, { cache:{ ignoreCache: true } })
        .then((data) => {
          if( !data.api ) return alert("Model load error")

          this.widget = data
        })
    },
    newJson(type){
      this.addModal = { show: true, type }
      this.logged = true
      if( type == 'model'){
        this.model = null
      }
    },
    optionfy(data, label, value){
      return data && data.map(i => ({label: i[label], value: i[value] }) )
    },
    auth({authRequest}){
        this.active.api = Object.assign(this.active.api, authRequest)
        this.logged = true
        this.$message('Success logged')
        this.forceRerender()
    },
    errors(data){
      this.$message(data.message || data)

      console.error('Playgrourd error', data)
    },
    reloadProjects(){
      loadProjects({ cache:{ ignoreCache: true } }).then(data => {
        this.$store.commit('set', ['projects', data])
      })
    },
    forceRerender(){
        this.render = false;
        this.$nextTick(() => {
          this.render = true;
        });
    },
    submitHandler(data){
      if( data.id )
        this.hooksRun('before:update', data)
      else
        this.hooksRun('before:create', data)

      this.submit = data
      this.$message('Data saved in result on json viewer')

      if( data.id )
        this.hooksRun('after:update', data)
      else
        this.hooksRun('after:create', data)
    },
    hooksRun(target, data){
      let hooks = get(this.active, 'hooks', []).filter(i => target == i.target )

      for(let act of hooks){
        if( act.handler ){
          console.debug("hooksRun Called", target, data)
          this.$bus.$emit(act.handler, this.sendType({ action: act}, data, data[(act.id || this.primaryKey)]) )
        }
      }
    },
    loadActions(){
      this.$bus.$on(`${this.active.domain}:save`, this.submitHandler);
      this.$bus.$on(`${this.active.domain}:delete`, this.submitHandler);
      this.$bus.$on("model:redirect", this.redirect)
      this.$bus.$on("model:grid", this.openModel)
      this.$bus.$on("model:form", this.openForm)
    },
    destroyActions(){
      this.$bus.$off(`${this.active.domain}:save`, this.submitHandler);
      this.$bus.$off(`${this.active.domain}:delete`, this.submitHandler);
      this.$bus.$off("model:redirect", this.redirect)
      this.$bus.$off("model:grid", this.openModel)
      this.$bus.$off("model:form", this.openForm)
    }
  },
   
  beforeDestroy() {
    if( this.active )
      this.destroyActions()
  },
}
</script>
