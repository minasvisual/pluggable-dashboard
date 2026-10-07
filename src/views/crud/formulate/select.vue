<template>
  <div
    :class="context.classes.element"
    :data-type="context.type"
    :data-multiple="attributes && attributes.multiple !== undefined"
    v-if="renderComponent"
  >
    <FormulateSlot
      name="prefix"
      :context="context"
    >
      <component
        :is="context.slotComponents.prefix"
        v-if="context.slotComponents.prefix"
        :context="context"
      />
    </FormulateSlot>
    <select
      v-model="context.model"
      v-bind="attributes"
      :data-placeholder-selected="placeholderSelected"
      v-on="$listeners"
      @blur="context.blurHandler"
      :disabled="loading"
    >
      <option
        v-if="context.placeholder"
        value
        hidden="hidden"
        disabled
        :selected="!hasValue"
      >
        {{ context.placeholder }}
      </option>
      <template
        v-if="!optionGroups"
      >
        <option
          v-for="option in options"
          :key="option.id"
          :value="option.value"
          :disabled="!!option.disabled"
          v-bind="option.attributes || option.attrs || {}"
          v-text="option.label"
        />
      </template>
      <template
        v-else
      >
        <optgroup
          v-for="(subOptions, label) in optionGroups"
          :key="label"
          :label="label"
        >
          <option
            v-for="option in subOptions"
            :key="option.id"
            :value="option.value"
            :disabled="!!option.disabled"
            v-bind="option.attributes || option.attrs || {}"
            v-text="option.label"
          />
        </optgroup>
      </template>
    </select>
    
    <FormulateSlot
      name="suffix"
      :context="context"
    >
      <component
        :is="context.slotComponents.suffix"
        v-if="context.slotComponents.suffix"
        :context="context"
      />
    </FormulateSlot>
  </div>
</template>

<script>
import { get } from 'lodash'
import { request, getData, loadModel } from '../../../services/models'
import { interpolate, mergeDeep, queuedRequest } from '../../../services/helpers'

export default {
  name: 'FormulateInputSelect',
  props: {
    context: {
      type: Object,
      required: true
    }
  },
  data(){ return{
    renderComponent: true,
    loading: false,
    options: []
  }},
  computed: { 
    optionGroups () {
      return this.context.optionGroups || false
    },
    placeholderSelected () {
      return !!(!this.hasValue && this.context.attributes && this.context.attributes.placeholder)
    },
    type () {
      return this.context.type
    },
    attributes () {
      return this.context.attributes || {}
    },
    hasValue () {
      return this.context.hasValue
    },
    currentProject(){
      return this.$store.state.currentProject || null
    }, 
    request(){
      return get(this.$store, `state.auth.${this.currentProject.code}.request`, {})
    }, 
    placeholder(){
      return this.loading ? 'Loading...' : 'Select One'
    },
    formValues(){
      return this.$store.state.crud.row || {}
    }
  },
  methods:{ 
    forceRerender() {
      this.renderComponent = false;

      this.$nextTick(() => {
        this.renderComponent = true;
      });
    },
    convertAttributesToSchema(attr){
      return {
        rootApi: get(attr, 'url'),
        wrapData: get(attr, 'wrapData'),
        fieldLabel: get(attr, 'fieldLabel'),
        fieldValue: get(attr, 'fieldValue'),
        ...get(attr, 'requestOptions', {})
      }
    },
    async getOptions({ rootApi, fieldLabel, fieldValue, ...data }){
      try{ 
        if( rootApi ){
          this.loading = true;
          data = mergeDeep(data, this.request)
          rootApi = interpolate(rootApi, { data: this.context.model })
          const schema = { api: { ...data, rootApi, resource: this.formValues } }
          let { rows } = await queuedRequest(
            JSON.stringify([schema, this.context.model]),
            () => getData(schema, { data: this.context.model })
          )

         this.options = rows && rows.map((i, k) => ({ 
              label: get(i, fieldLabel, i.toString()), 
              value: get(i, fieldValue, k)
            }) 
          )
          
          this.loading = false;
          this.forceRerender()
        }
      }catch(e){
          alert('Erro to get data from '+ rootApi)
          console.log('Erro select input', e)
      }
    }
  },
  async mounted(){
    this.options = this.context.options

    let { attributes, schema = {} } = this.context.attributes
    if( schema && typeof schema  == 'string' )
      schema = await loadModel( this.currentProject.resources_path + schema).then( data =>  { 
         if( !data || !data.api ) throw { message: "Api fail" } 
         return data
      }).catch( () => ({}) )

    if( attributes && attributes.url )
      attributes = this.convertAttributesToSchema(attributes)

    this.getOptions({ ...schema.api, ...attributes })
  },
}
</script>