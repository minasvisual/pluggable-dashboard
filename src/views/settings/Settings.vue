<template>
  <CRow>
    <CCol col="12" lg="6">
      <CCard>
        <CCardHeader>
            Dashboard Settings
        </CCardHeader>
        <CCardBody>
            
            <CCol>

              <FormulateInput 
                  v-if="projects && settings"
                  name="currentProject"
                  type="select"
                  label="Default project"
                  :options="optionfyObject(projects, 'name', 'code')"
                  element-class="d-flex"
                  v-model="settings.current"
                  @change="saveSettings"
              >
                  <template #suffix>
                      <CButton @click="reloadProjects" ><CIcon name="cil-reload" /></CButton>
                  </template>
              </FormulateInput>

              <FormulateInput 
                  v-if="projects && settings"
                  name="sidebarShow"
                  type="select"
                  label="Sidebar responsive visiblity"
                  :options="{'true':'Always show', 'false': 'Never show', 'responsive': 'Responsive'}"
                  v-model="settings.sidebarShow"
                  @change="saveSettings"
              />

              <FormulateInput 
                  v-if="projects && settings"
                  name="sidebarMinimize"
                  type="select"
                  label="Sidebar width state"
                  :options="{ 'true': 'Minimized', 'false':'Opened' }"
                  v-model="settings.sidebarMinimize"
                  @change="saveSettings"
              />

            </CCol>
        </CCardBody>
      </CCard>
    </CCol>
  </CRow>
</template>

<script>
import { getLocalStorage, saveSettings } from '../../services/helpers'
import TableMixin from '../../services/table.mixin'
import SessionMixin from '../../services/session.mixin'

export default {
  mixins:[TableMixin, SessionMixin],
  data(){
    return {
      settings: getLocalStorage('settings') || {}
    }
  },
  methods:{
    saveSettings({ target: { name, value }}){
      console.log(name, value)
      saveSettings(this.settings)

      if( ['sidebarMinimize','sidebarShow'].includes(name) ){
        value = value === 'true'

        this.$store.commit('set', [name, value])
      }
    },
    async reloadProjects(){
        this.$store.commit('setLoader', ['global', true])
        await this.loadProjects(true).then(() => {
            this.$store.commit('setLoader', ['global', false])
        })
    }
  },
  computed:{
    projects(){
      return this.$store.state.projects
    }
  }
}
</script>
