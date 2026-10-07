<template>
  <section>
    <div class="form-loader w-100 text-center" v-if="loader || loading">
      <CSpinner color="info"/>
    </div>
    <FormulateForm 
          v-else
          v-model="model"
          :schema="form"
          @submit="submit"
          #default="{ hasErrors }"
          :class="get(schema, 'formClasses')"
    >
      <div class="alert alert-warning" v-if="error">
        <code>
          {{ error }}
        </code>
      </div>

      <div class="action-buttons mt-3" v-if="get(schema, 'submit', true)">
        <CButton
            type="button"
            color="danger"
            class="mr-2"
            @click="$emit('close', { refresh: false })"
          >
              Cancel
        </CButton>
        <CButton
            type="submit"
            color="success"
            :disabled="hasErrors"
          >
              Save
        </CButton>
      </div>
    </FormulateForm>
  </section>
</template>

<script>
import { get } from 'lodash'
import { schemaColumns, formatModel, getErrorMessage } from '../../services/helpers'
import ControllerMixin from '../../services/controller.mixin'

export default {
    mixins:[ControllerMixin],
    data(){
      return{
        form: [],
        model: {},
        columns: [],
        loader: true,
        error:null
      }
    },
    props:{
      schema: {
        type: [Object,String]
      },
      data: {
        type: [Number, Object]
      },
      save: {
        type: Boolean
      }
    },
    computed:{
      loading(){
        return this.$store.state.loading.form 
      }, 
      primaryKey(){
        return get(this.schema, 'primaryKey', 'id')
      }, 
      isStandalone(){
        return ( get(this.schema, 'type') == 'form' || get(this.schema, 'api.bypassGetById', false) ===  true || get(this.schema, 'api.rootApi', false) === false )//|| get(this.schema, 'api.bypassGetData', false)
      }
    },
    async mounted(){
      try{
        this.loader = true 
        this.schema = await this.loadNestedSchema(this.schema)

        this.init()

        this.$bus.$on(`${this.schema.domain}:error`, this.handleError);
      }catch(e){
        console.error("formulate mount error", e)
      }
    },
    beforeDestroy(){
      this.$bus.$off(`${this.schema.domain}:error`, this.handleError);
    },
    methods: {
      async submit (data) {
        try{       
          if( this.save === true )
            await this.saveData(this.schema, data)
              .then((res) => {
                  this.$emit('close', { refresh: true })
                  return res
              })
              
          this.$emit('model:saved', data)
        }catch(err){
          this.$message(getErrorMessage(err), 'danger')
        }
        return data
      },
      async loadNestedSchema(schema){
        if( schema && typeof schema  == 'string' )
          return this.loadModelByUrl( this.currentProject.resources_path + schema).then( data =>  { 
            if( !data || !data.api ) throw { message: "Api fail" } 
            return data
          })
        else
          return schema
      },
      getRow(){
        console.debug('formulate get row', this.data)
        if( !this.data || Object.keys(this.data).length == 0 || !this.data[this.primaryKey] ) return Promise.resolve({})
        if( typeof this.data !== 'object' ) this.data = { [this.primaryKey]: this.data }

        return this.getData(this.schema, this.data)
      }, 
      init(){
         ( this.isStandalone ? Promise.resolve(this.data) : this.getRow() ).then( (data) => {
              this.form =  get(this.schema, 'properties', [])
              this.columns = schemaColumns( this.form )
              data = formatModel(this.columns, data)
              
              this.model = data
              this.loader = false
          }).catch((err) => {
            this.$message( getErrorMessage(err) )
              
            this.loader = false
          })
      },
      handleError(err){
        console.debug("error hook", err)
        this.error = err
      },
    },
}
</script>

<style lang="scss">

.formulate-input{
  width: 100% !important;
  margin-right: 10px;
  &:last-child{
    margin-right: 0;
  }
}
.formulate-input-element{
  	max-width: 100% !important;
    input[readonly] {
      background: #eee;
    }
}
.action-buttons{
  justify-content: flex-end;
  display: flex;
  .formulate-input:first-child{
    margin-right: 10px;
  }
}

</style>