<template>
  <section>
      <CDataTable
        v-if="grid"
        :items="grid"
        :fields="titles"
        :columnFilter='{ external: true, lazy: false, resetable: true }'
        :sorter='{ external: true, resetable: true }'
        :items-per-page="perPage"
        :clickableRows="true"
        :loading="loading"
        :addTableClasses="gete(schema, 'tableClasses', undefined)"
        size="sm"
        hover
        @update:sorter-value="(qr) => fetchQueryInfo('sort', qr)" 
        @update:column-filter-value="(qr) => fetchQueryInfo('filter', qr)" 
      >

        <template #over-table >
          <section class="row py-2 w-100">
            <div class="col-7 d-flex ">
              <Toolbar :schema="schema" class="d-flex ">
                <span v-if="selectedRow.length > 0" class="selectedActions">
                  <label class="m-0">Selected: {{ selectedRow.length }} </label> 
                  <CButton @click="bulkDelete" v-if="can(schema, 'canDelete')">
                      <CIcon name="cil-trash" />
                  </CButton>
                </span>
                <CButton @click="fetchQueryInfo('pageChange', {})">
                  <CIcon name="cil-reload" />
                </CButton>
                <CButton @click="onCreate" v-if="can(schema, 'canCreate')">
                  <CIcon name="cil-plus" />
                </CButton>
              </Toolbar>
            </div>
            <div class="col-5 d-flex justify-content-end align-items-center p-0" v-if="hasPageSize">
              <span>Limit: </span>
              <CSelect :options="showPerPage" :value="perPage" class="m-0 ml-2"
                  @update:value="(num) => fetchQueryInfo('pageSize', num)" />
            </div>
          </section>
        </template>

        <template #selected-header="{item}"> 
            <CInputCheckbox type="checkbox" inline @update:checked="selectionAll()" style="padding:0; margin:0;" /> 
        </template>

        <template v-for="cell of getCustomFilters(titles)" #[`${cell.key}-filter`]="item" >
            <FormulateInput v-bind="cell.filter" :key="cell.key" 
                :element-class="'form-control form-control-sm'"
                @blur-context="({model}) => fetchQueryInfo('filter', {...item, [cell.key]: model})" 
            />
        </template>

        <template v-for="cell of titles" #[cell.key]="{item, index}" >
          <td :class="['td-'+cell.key]" :key="cell.key">
            <CellTypes :cell="cell" :data="item" />
          </td>
        </template>

        <template #selected="{item}">
          <td :class="['td-selection']">
            <CInputCheckbox type="checkbox" :checked="isSelected(item)" @update:checked="selectionChange(item)" />
          </td>
        </template>

        <template #actions="{item, index}">
          <td :class="['td-actions']">
              <Toolbar :schema="schema" target="rowbar" class="d-flex text-right" :data="item"> 
                <template #append> 
                  <CButton  class="card-header-action mr-3"  @click="onEdit(item)" v-if="can(schema, 'canEdit')"> 
                    <CIcon name="cil-pencil" />
                  </CButton>
                  <CButton   class="card-header-action"  @click="onDelete(item)"  v-if="can(schema, 'canDelete')"> 
                    <CIcon name="cil-trash" />
                  </CButton>
                </template>
              </Toolbar>
          </td>
        </template>
        
        <template #no-items-view>
          <h6 class="text-center">No data found</h6>
        </template>

        <template #loading>
          <div class="text-center"><CSpinner color="info"/></div>
        </template>

        <template #under-table v-if="hasPagination">
            <CPagination
              v-if="schema.api.pagination !== false && totals > 0"
              :activePage.sync="currentPage"
              :pages="calcPages(totals, perPage)"
              size='sm'
              align="center"
              @update:activePage="onPageChange"
            />
        </template>
      </CDataTable> 
  </section>
</template>

<script>  
import { mapState } from 'vuex'
import { get, has, debounce, isEqual, filter } from 'lodash' 

import TableMixin from '../../../services/table.mixin'
import CellTypes from './index' 
import Toolbar from './Toolbar.vue'

export default {
  name:"TableServer2",
  mixins:[TableMixin],
  props:['schema','resource'],
  components:{
    CellTypes, Toolbar
  },
  data () {
    return {
      currentPage: 1,
      perPage: 5,
      showPerPage: [5, 15, 25, 50, 100], 
      queryInfo: { type: "init", page: 1 },
      data: {},
      details: [],
      selectedRow: [],
      collapseDuration: 0
    }
  },
  computed:{
    ...mapState({
      loading: state => state.loading.table
    }),
    titles(){
      return has(this.schema, 'properties') ? this.schemaColumns([ ...this.schema.properties ]) : []
    },
    grid(){
      return get(this.resource, 'rows', [])
    },
    totals(){
      return get(this.resource, 'total', 0)
    }
  },
  watch: {
    resource: {
      immediate: true,
      handler(newVal, oldVal) {
        const count = get(newVal, 'rows', []).length
        const prevCount = get(oldVal, 'rows', []).length
        if (count > prevCount) this.perPage = count
      }
    }
  },
  methods: {
    resetGrid(){
      this.data = { rows:[], total:0 }
      this.$store.commit('setLoader', ['table', false])
    },
    fetchData: debounce(async function(queryInfo){
      this.queryInfo = queryInfo
      this.$emit('fetchData', queryInfo)
    }, 700),
    onPageChange(page) {
      this.queryInfo = { type: 'page', page }
      this.$emit('fetchData', this.queryInfo)
    },
    onCreate() {
      this.$emit('actions:create', {})
    },
    onEdit(row){
      this.$emit('actions:edit', row)
    },
    onDelete(row){
      if( confirm('Are you sure to delete?') ) 
          this.$emit('actions:delete', row)
    },
    async bulkDelete() {
      if( confirm(`Are you sure to delete ${this.selectedRow.length} rows?`) ){
          this.$emit('actions:deleteBatch', this.selectedRow)
      }
    },
    getBadge (status) {
      switch (status) {
        case 'Active': return 'success'
        case 'Inactive': return 'secondary'
        case 'Pending': return 'warning'
        case 'Banned': return 'danger'
        default: 'primary'
      }
    },
    toggleDetails (item) {
      this.$set(this.items[item.id], '_toggled', !item._toggled)
      this.collapseDuration = 300
      this.$nextTick(() => { this.collapseDuration = 0})
    },
    getCustomFilters(arr){
      return arr.filter( f => {
        return typeof f.filter == 'object'
      })
    },
    gete:get
  },
  async mounted(){
      this.data = { rows: get(this.resource, 'rows', []), total: get(this.resource, 'totals', 0) }
      
      //await this.fetchData(this.queryInfo)
      //this.$emit('fetchData', this.queryInfo)
  }
}
</script>