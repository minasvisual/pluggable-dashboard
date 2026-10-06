import { has, get } from 'lodash'
import { interpolate, getErrorMessage } from './helpers'
import { request, loadProjects } from './models' 

export default {
  computed: {
    currentProject(){
      return this.$store.state.currentProject || null
    }, 
    config(){ 
      return this.project.auth || null 
    },
    hasAuth() {
      return (has(this.currentProject, 'auth') || get(this.schema, 'auth')) && !get(this.currentProject, 'auth.use_system_auth', false);
    },
    showCrud() {
      return (!this.hasAuth || (this.hasAuth && this.logged))
    },
    logged(){ 
      return get(this.$store, `state.auth.${this.currentProject.code}.logged`, false)
    },
    session(){ 
      return get(this.$store, `state.auth.${this.currentProject.code}`, false)
    }
  },
  methods: {
    async loadProjects(refresh = false){
      return loadProjects({ cache:{ ignoreCache: refresh }})
          .then( (data) => {
              if( !Array.isArray(data) )
                throw "Error to parse JSON"

              this.$store.commit('set', ['projects', data]) 
              return data
          })
          .catch( e => {
            this.$message( e.message || 'Erro to load projects')
          }).finally(() => {
            this.$store.commit('setLoader', ['global', false])
          })
    },
    authenticate({username, secret, remember}){
      try{
        if( !has(this.config, 'url_login') ) return new Error('url login doest exist');

        return request(this.resolveUrl(this.config.url_login), {
                        method: get(this.config, 'url_method', 'post'),
                        data: {
                          [get(this.config, 'field_username', 'email')]: username,
                          [get(this.config, 'field_secret', 'password')]: secret,
                          [get(this.config, 'field_remember', 'remember')]: remember,
                        },
                        headers: get(this.project, 'api.headers', {})
                        //{
                          //[get(this.config, 'request_token', 'access-token')]: ''
                        //}
                      }, { wrap: false } )
                .then((res) => {
                  let token = this.storageToken(res)
                  let reqAuthData = this.authRequest(token)

                  this.$store.commit('setAuth', [ this.project.code, { request: reqAuthData, logged: true, token }])
                  return res
                })
      }catch(e){ 
        return new Error(e)
      }
    },
    storageToken({data, headers}){
      let token = null
      if( get(this.config, 'response_mode', 'body') === 'header' ){
        token = headers[ get(this.config, 'response_token', 'access-token') ];
      }else{
        token = get(data, get(this.config, 'response_token', 'access_token'), null)
      } 

      if( !token ) {
        return new Error ({message: 'token not found', config: this.config, data, headers})
      }

      sessionStorage.setItem(`${this.project.code}_session`, token)
      return token
    },
    isLogged(token){
      try{
        
        if( !has(this.config, 'logged_url') ){
          return Promise.reject({message: 'Logged url not found'})
        }
        
        let reqAuthData = this.authRequest(token)
        // never validate a session against a cached response
        let options = { method: 'get', cache: { ignoreCache: true }, ...reqAuthData  }

        return request( this.resolveUrl(get(this.config, 'logged_url')), options, { session: false })
                .then((data) => {
                    let user = this.setUser(data)
                    
                    this.$store.commit('setAuth', [ this.currentProject.code, { user, request: reqAuthData, logged: true, token }])
                    return {token, user, request: reqAuthData }
                })
      }catch(e){
        return Promise.reject({message: e.message})
      }
    },
    authRequest(token){
      let tokenRequest = get(this.config, 'request_token_expression', '{token}')
      if( get(this.config, 'request_mode', 'header') == 'query' )
        return { 
          headers: get(this.currentProject, 'api.headers', {}),
          params:{
              [get(this.config, 'request_token', 'access-token')] : interpolate(tokenRequest, {token})
          }
        } 
      else 
        return {
          headers:{
            ...get(this.currentProject, 'api.headers', {}),
            [get(this.config, 'request_token', 'access-token')] : interpolate(tokenRequest, {token})
          }
        }
    },
    setUser(data){
      if( !has(this.config, 'logged_model') ) return {};

      let { id, name, username, role, ...extra } = get(this.config, 'logged_model')
      let user = {
        "id": get(data, id, "id"),
        "name": get(data, name, "name"),
        "username": get(data, username, "email"),
        "role": get(data, role, "level")
      }
      // any additional mapped field (e.g. tenant) is copied as-is
      Object.keys(extra).forEach(key => user[key] = get(data, extra[key], null))

      return user;
    },
    resolveUrl(url){
      if( !url || /^https?:\/\//i.test(url) ) return url

      let base = get(this.project, 'url') || get(this.currentProject, 'url', '')
      return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
    },
    doLogout(){
      sessionStorage.removeItem(`${this.currentProject.code}_session`)
      
      this.$store.commit('setAuth', [ this.currentProject.code, {  logged: false }])

      return Promise.resolve({  logged: false })
    }
  },
};
