<template> 
  <section :class="(schema.wrapperClass || 'col-12')">
    <Auth
        v-if="current && schema" 
        :project="current" 
        :schema="schema"
        @auth:logged="onLogged"
    >
      <template v-slot="{ schema }">
        <div :class="(schema.class || 'card')">
          <div v-if="schema.title" class="card-header" >
            <strong>{{ schema.title }}</strong>
            
            <div class="card-header-actions" > 
              <CButton size="sm" class="card-header-action" @click.prevent="$emit('reload')">
                <CIcon name="cil-reload" />
              </CButton>
            </div>
          </div>
          <div v-if="renderComponent" class='card-body'>  
              <div v-if="widget.prefix" class="prefix" v-html="widget.prefix"></div>
              <component :is="(widget.type || 'Table')" :class="(widget.class || '')" 
                    v-bind="{ pivot, schema, widget, dataset }"  />
              <div v-if="widget.suffix" class="suffix" v-html="widget.suffix"></div>
          </div>
        </div>
      </template>
    </Auth>
  </section>
</template>

<script>
import { get } from 'lodash'
import { getAuthMode } from '../../services/helpers'
import { getData } from '../../services/models'
import Pivot from "quick-pivot";
import Auth from '../crud/auth'

import ChartBar from './types/chartbar'
import ChartPie from './types/chartPie'
import ChartLine from './types/chartline'
import Table from './types/table'
import Tiles from './types/tiles'

export default {
  components:{
    Auth, ChartBar, ChartPie, ChartLine, Table, Tiles
  },
  props:{
    schema:{
      type: Object,
      default: () => ({})
    },
    resources:{
      type: Array
    }
  },
  data() {
    return { 
      renderComponent: false,
      loaded: false,
      dataset: [],
      pivot: {},
      ui: false
    }
  },
  computed:{
    current(){
      return this.$store.state.currentProject || {}
    },
    widget(){
      return this.schema.widgets || {}
    }
  },
  methods:{
    // own-auth schemas: the project token only reaches schema.api after Auth validates the session,
    // so the dataset must be requested after that, never straight on mount
    onLogged({ request } = {}){
      if( request ) this.schema.api = Object.assign({}, this.schema.api, request)
      if( !this.loaded ) this.loadWidget()
    },
    loadWidget: async function (ops){ 
      try{
        this.loaded = true
        this.renderComponent = false
        if( !get(this.schema, 'api.rootApi', false) && !this.resources ) return false;

        await this.loadDataset()

        if( !get(this.schema, 'widgets', false) )
          return false;

        this.pivot =  this.loadPivot(this.widget)

        this.renderComponent = true
      }catch(e){
        console.log(e)
        this.$message(e.message)
      }
    },
    async loadDataset(ops){
      if( this.resources )
        this.dataset = this.resources
      else
        this.dataset = await getData(this.schema, {}, ops).then( ({rows, total}) => rows )
    },
    loadPivot(widget){
        if( widget.source == 'raw' )
          return { data: { table: this.dataset }}

        let params = widget.params || {};

        const rowsToPivot = params.rows || [];
        const colsToPivot = params.cols || [];
        const aggregationDimension = params.group || "";
        const aggregator = params.action || "count";

        return new Pivot(
          this.dataset,
          rowsToPivot,
          colsToPivot,
          aggregationDimension,
          aggregator
        );
    }

  },
  mounted(){
    if( getAuthMode(this.schema, this.current) !== 'own' )
      this.loadWidget()
  }
}
</script>

<style lang="scss">
.pvtWrapper.showUi tbody tr td:not(.pvtOutput){
  display:none;
  border: none;
}
</style>