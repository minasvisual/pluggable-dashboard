<template>
    <CSelect
        class="table-select"
        v-if="renderComponent"
        v-model="data"
        :options="(cell.options || options)"
        size="sm"
        :disabled="true"
        v-on="$listeners"
    />
</template>


<script>
import { mergeDeep, filterParams, queuedRequest } from '../../../services/helpers'
import InputMixin from '../../../services/input.mixin'

export default {
  props:['data', 'cell'],
  mixins: [InputMixin],
  data(){return{ 
  }},
  computed:{

  },
  async created(){
    let { action, schema } = this.cell

    if( schema )
      schema = await this.loadNestedSchema(schema)
      
    if( action && action.fieldValue )
      schema = { api: mergeDeep(this.convertAttributesToSchema(action), (schema.api || {})) }

    if( schema && schema.api  )
      this.cell.options = await this.fetchOptions(schema, action)

    this.renderComponent = true
  },
  methods:{
    // Identical requests (same api, value and filter) share one queued promise
    fetchOptions(schema, action){
      const filter = filterParams(schema.api, { filters:[{prop: action.fieldValue, value: this.data}] })
      const key = JSON.stringify([schema.api, this.data, filter])

      return queuedRequest(key, () => this.getOptions({ ...schema.api }, this.data, filter))
    },
    forceRerender() {
      this.renderComponent = false;

      this.$nextTick(() => {
        this.renderComponent = true;
      });
    }, 
  }
}
</script>

<style lang="css">
  .table-select select{
    -webkit-appearance: none;
    -moz-appearance: none;
    text-indent: 1px;
    text-overflow: '';
    border: none  !important;
    background-color: transparent !important;
  }
</style>