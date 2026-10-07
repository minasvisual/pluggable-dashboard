<template>
  <div
    :class="`formulate-input-element formulate-input-element--${context.type}`"
    :data-type="context.type"
    v-if="renderComponent"
  >
    <CSelect
        v-model="context.model"
        @change="change"
        v-bind="context.attributes"
        :options="options"
        :placeholder="placeholder"
    >
    </CSelect>
  </div>
</template>

<script>
import { get } from 'lodash'
import { request, sessionFor } from '../../../services/models'
import { interpolate, queuedRequest } from '../../../services/helpers'
export default {
  props: {
    context: {
      type: Object,
      required: true
    },
  },
  data(){return{
    renderComponent: true,
    loading: false,
    options: []
  }},
  computed:{
    model(){
      return this.context.model
    },
    type(){ 
      return this.context.attributes.attributes.type || 'select' 
    }, 
    currentProject(){
      return this.$store.state.currentProject || null
    }, 
    request(){
      return get(this.$store, `state.auth.${this.currentProject.code}.request`, {})
    }, 
    placeholder(){
      return this.loading ? 'Loading...' : 'Select One'
    }
  },
  created(){
    this.options = this.context.options
    let { attributes } = this.context.attributes

    this.getOptions(attributes || {})
  },
  methods:{
    change({target: { value }}){
      this.context.model = value
    },
    forceRerender() {
      this.renderComponent = false;

      this.$nextTick(() => {
        this.renderComponent = true;
      });
    },
    async getOptions({ url, requestOptions={}, fieldLabel, fieldValue, wrapData=null }){
      try{
        if( url ){
          this.loading = true;
          requestOptions = Object.assign(requestOptions, this.request)
          let urlNew = interpolate(url, { data: this.context.model })
          let data = await queuedRequest(
            JSON.stringify([urlNew, requestOptions]),
            () => request( urlNew, { method:'get', ...requestOptions }, { session: sessionFor() })
          )

          if( wrapData )
            data = get(data, wrapData, data)


          this.options = data && data.map((i, k) => ({ 
              label: get(i, fieldLabel, i.toString()), 
              value: get(i, fieldValue, k)
            }) 
          )
          
          this.loading = false;
          
          this.forceRerender()
        }
      }catch(e){
          alert('Erro to get data from '+ url)
      }
    }
  }
}
</script>