import Vue from 'vue'
import Vuex from 'vuex'
import { get } from 'lodash'
import { request, getUserData, getAuthHeaders } from './services/models'
import { getLocalStorage } from './services/helpers'

Vue.use(Vuex)

let settings = getLocalStorage('settings') || {}

const state = {
  sidebarShow: get(settings, 'sidebarShow', 'responsive'),
  sidebarMinimize: get(settings, 'sidebarMinimize', 'true') === 'true',
  projects:[],
  currentProject: {},
  auth:{},
  loading: {},
  cache:{},
  crud:{},
  schemas:{},
}

const mutations = {
  toggleSidebarDesktop (state) {
    const sidebarOpened = [true, 'responsive'].includes(state.sidebarShow)
    state.sidebarShow = sidebarOpened ? false : 'responsive'
  },
  toggleSidebarMobile (state) {
    const sidebarClosed = [false, 'responsive'].includes(state.sidebarShow)
    state.sidebarShow = sidebarClosed ? true : 'responsive'
  },
  set (state, [variable, value]) {
    state[variable] =  value
    return state = { ...state }
  },
  setAuth (state, [session, value]) {
    state.auth[session] = value
    return state = {...state, auth: state.auth}
  },
  setSchema (state, [data, value]) {
    state.schemas[data] = value
    return state = {...state, schemas: state.schemas}
  },
  setLoader (state, [session, value]) {
    state.loading[session] = value
    return state = { ...state, loading: state.loading }
  }
}

const getters = {
  logged(state){
    return state.auth
  },
  dashLogged(state){
    return state.auth.dash
  }
}

const actions = {
  login (ctx, { username, password, remember }) {
      let headers = process.env.VUE_APP_DEFAULT_HEADERS ? JSON.parse(process.env.VUE_APP_DEFAULT_HEADERS) : {}
      return request( 
        process.env.VUE_APP_LOGIN_URL , {
          method: 'POST',
          data: { 
            [process.env.VUE_APP_LOGIN_USER_FIELD]: username, 
            [process.env.VUE_APP_LOGIN_PASS_FIELD]: password,
            remember
          },
          headers
        }
      ).then( data => {
        let token =  get(data, process.env.VUE_APP_LOGIN_TOKEN_PATH, 'access_token' )
        localStorage.setItem('dash_session', token)
        ctx.commit('setAuth', ['dash', { isLogged: true, token }])
        // A navegação será tratada pelo componente Login
      }).catch( err => {
        alert('Login Error: '+ err.message)
      })
  },
  isLogged(ctx){
    let token = localStorage.getItem('dash_session')
    if( token ){
      let headers = getAuthHeaders({ 
        "request_mode": process.env.VUE_APP_LOGIN_TOKEN_MODE || 'header',
        "request_token": process.env.VUE_APP_LOGIN_TOKEN_HEADER || 'access-token',
        "request_token_expression": process.env.VUE_APP_LOGIN_TOKEN_HEADER_EXPRESSION || '{token}', 
      }, token)

      return getUserData({ method: 'get', ...headers })
          .then( data => {
              ctx.commit('setAuth', ['dash', {isLogged: true, token, user: data }])
              // A navegação será tratada pelo componente Login
              return data
          })
          .catch(({response, message }) => {
            
            if( response && response.status > 400 && response.status < 410 )
              ctx.dispatch('logout')

            return { message, status }
          })
    }else{
      
      ctx.dispatch('logout')
      return Promise.reject({isLogged: false})
    }
  },
  logout(ctx){
    let auth = { isLogged: false }
    let token = localStorage.getItem('dash_session')
    console.log("dispatched logout", token)
    if( token ){   
        localStorage.removeItem('dash_session')
    }
    ctx.commit('setAuth', ['dash', auth]) 
    // A navegação será tratada pelo componente Login
  },
  requestFail(ctx, { response }){
    let current = ctx.state.currentProject || {}
    console.log('request fail', response)
    if( get(response, 'config.url', '').includes(current.url) ){
      console.log(current)
      if( response.status == get(current, 'auth.request_expiration_status') || response.data.includes("expired") )
        ctx.dispatch('setAuth', [ current.code, {logged: false} ])
      else if( get(current, 'auth.use_system_auth') ){
        ctx.dispatch('logout')
      }
    }
    else if( get(response, 'config.url', '').includes( process.env.VUE_APP_LOGGED_URL ) ){
      ctx.dispatch('logout', { logged: false })
    }

  },
  notification: (context, {title='Pluggable Dash', body, click}) => {
    // Let's check if the browser supports notifications
    const sendNotification = () => {
      var notification = new Notification(title, {
        body
      });
      if( click && typeof click == 'function' )
        notification.onclick = click

      setTimeout(() => notification.close(), 5*1000);
    }
    
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
    }
  
    // Let's check if the user is okay to get some notification
    else if (Notification.permission === "granted") {
        sendNotification()
    }
  
    // Otherwise, we need to ask the user for permission
    // Note, Chrome does not implement the permission static property
    // So we have to check for NOT 'denied' instead of 'default'
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission(function (permission) {
        // Whatever the user answers, we make sure we store the information
        if(!('permission' in Notification)) {
          Notification.permission = permission;
        }
        // If the user is okay, let's create a notification
        if (permission === "granted") {
          sendNotification()
        }
      });
    } else {
      alert(`Permission is ${Notification.permission}`);
    }
  },
}
export default new Vuex.Store({
  state,
  mutations,
  actions,
  getters
})