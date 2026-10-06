<template >
  <section class="crud-wrapper" >
    <slot v-if="login" v-bind:schema="schema">
      vazio
    </slot>
    <div  v-else class="col-12 col-md-4 offset-md-4">
        <h3 v-if="loading" class="text-center">Authenticating...<CSpinner color="info" size="sm"/></h3>
        <FormulateForm 
          v-else
          v-model="model"
          @submit="doAuth"
          #default="{ hasErrors }"
        >

          <h4 class="text-center">Project Authentication</h4>
          
          <FormulateInput type="text" name="username" placeholder="Username" /> 

          <FormulateInput type="password" name="secret"  placeholder="Password" /> 

          <FormulateInput type="checkbox" name="remember" label="remember" /> 

          <div class="action-buttons mt-3">
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
                  Send
            </CButton>
          </div>
        </FormulateForm>
    </div>

  </section>
</template>

<script>
import { has, get, merge } from 'lodash'
import { getErrorMessage } from '../../services/helpers'
import SessionMixin from '../../services/session.mixin'

export default {
  mixins:[SessionMixin],
  props:{
      project:{
        type: Object,
        default: () => ({})
      },
      schema:{
        type: Object,
        default: () => ({})
      }
  },
  data(){return{
    loading: false,
    model: {},
    login: false
  }},
  methods:{
    doAuth(form){
      try{
        this.loading = true;
        return this.authenticate(form)
                  .then(this.success)
                  .catch(this.error)
      }catch(e){
        this.$message( getErrorMessage(e) )
        this.error(e)
        this.loading = false;
      }
    },
    success(res){
        let token = this.storageToken(res)
        let { data, headers } = res;

        if( !token ) {
          this.loading = false;
          return this.$emit('auth:failed', {message: 'token not found', config: this.config, data, headers})
        }
        let authRequest = this.authRequest(token)
       
        this.$emit('auth:logged', { logged: this.logged, request: authRequest })
        this.loading = false;
        this.login = true;
                    
    },
    error({ response, message, ...data }){
      this.$message( getErrorMessage({ response, message, ...data }) )
      console.log('Auth Error', message, response, data)
      this.loading = false;
      
      this.$emit('auth:failed', {message})
    },
    async checkLogged(token){
      try{
        let auth = await this.isLogged(token)
        console.debug('checkLogged: isLogged', auth)
        
        this.$emit('auth:logged', auth)

        return auth
      }catch(e){
        console.debug('checkLogged failed: token', e)
        this.$message( getErrorMessage(e) )
        this.login = false;
        this.$emit('auth:failed', {message: e.message})
        return null
      }
    },
    logout(){
      console.debug("called auth logout")
      this.loading = true;
      return this.doLogout().then(() => {
        this.loading = false;
        this.login = false;
      })
    }
  },
  beforeMount(){
    this.login = false
  },
  async mounted(){
    try{
      this.schema.api = merge(get(this.currentProject, 'api', {}), this.schema.api)

      console.debug('caled mounted auth')

      // no project/schema auth configured: the global (dash) login, handled by App.vue, is enough
      if( !this.hasAuth ) return this.login = true

      console.debug('auth process start')
      let token = sessionStorage.getItem(`${this.schema.session || this.project.code}_session`)
      console.debug('token session', token)

      if( !token ){
        this.loading = false;
        this.login = false;
        return console.debug('show login form')
      }

      // project auth configured: validate the token against auth.logged_url
      this.loading = true;
      if( has(this.config, 'logged_url') ){
        let auth = await this.checkLogged(token)

        if( !auth ){
          // token rejected or expired: drop it and ask for credentials again
          this.doLogout()
          this.loading = false;
          this.login = false;
          return
        }

        this.schema.api = Object.assign(this.schema.api, auth.request)
      }else{
        // nothing to validate against, trust the stored token
        let request = this.authRequest(token)
        this.$emit('auth:logged', { token, user: get(this.session, 'user', {}), request })
        this.schema.api = Object.assign(this.schema.api, request)
      }

      this.loading = false;
      this.login = true;
    }catch(e){
      this.login = false;
      this.loading = false;
      console.log('erro mounted auth', e)
      this.$emit('auth:failed', e)
      this.$message( getErrorMessage(e) )
    } 
  }
}
</script>