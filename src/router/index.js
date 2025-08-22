import Vue from 'vue'
import Router from 'vue-router'

// Containers
const TheContainer = () => import('@/containers/TheContainer')

// Views
const Dashboard = () => import('@/views/Dashboard')

const Playground = () => import('@/views/theme/Playground')
const Docs = () => import('@/views/theme/Docs')

// Views - Pages
const Page404 = () => import('@/views/pages/Page404')
const Page500 = () => import('@/views/pages/Page500')
const Login = () => import('@/views/pages/Login')
const Register = () => import('@/views/pages/Register')

// Users
const Users = () => import('@/views/users/Users')
const User = () => import('@/views/users/User')

// Settings
const Settings = () => import('@/views/settings/Settings')
const Profile = () => import('@/views/settings/Profile')

// CRUD
const Base = () => import('@/views/crud/base')

Vue.use(Router)

const router = new Router({
  mode: 'history', // https://router.vuejs.org/api/#mode
  linkActiveClass: 'active',
  scrollBehavior: () => ({ y: 0 }),
  routes: configRoutes()
})

// Guard de rota global para evitar navegações conflitantes
router.beforeEach((to, from, next) => {
  const hasAuth = process.env.VUE_APP_LOGIN === 'true'
  const token = localStorage.getItem('dash_session')
  const isLogged = token && hasAuth
  
  // Se não precisa de autenticação, permite acesso
  if (!hasAuth) {
    next()
    return
  }
  
  // Se precisa de autenticação mas não está logado
  if (hasAuth && !isLogged) {
    if (to.path.includes('/pages/')) {
      next()
    } else {
      next('/pages/login')
    }
    return
  }
  
  // Se está logado e tenta acessar páginas de login
  if (isLogged && to.path.includes('/pages/')) {
    next('/dashboard')
    return
  }
  
  next()
})

export default router

function configRoutes () {
  return [
    {
      path: '/',
      redirect: '/dashboard',
      name: 'Home',
      component: TheContainer,
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: Dashboard
        },
        {
          path: 'theme',
          redirect: '/theme/playground',
          name: 'Theme',
          component: {
            render (c) { return c('router-view') }
          },
          children: [
            {
              path: 'playground',
              name: 'Playground',
              component: Playground
            },
            {
              path: 'docs',
              name: 'Docs',
              component: Docs
            },
          ]
        },
        {
            path: 'api',
            name: 'Resource',
            component: {
              render(c) {
                return c('router-view')
              }
            },
            children: [
              {
                path: ':project/:model',
                meta: {
                  label: 'Model Details'
                },
                name: 'List',
                component: Base
              }
            ]
        },
        {
          path: 'users',
          meta: {
            label: 'Users'
          },
          component: {
            render(c) {
              return c('router-view')
            }
          },
          children: [
            {
              path: '',
              name: 'Users',
              component: Users
            },
            {
              path: ':id',
              meta: {
                label: 'User Details'
              },
              name: 'User',
              component: User
            }
          ]
        },
        {
          path: 'settings',
          meta: {
            label: 'Settings'
          },
          component: {
            render(c) {
              return c('router-view')
            }
          },
          children: [
            {
              path: '',
              name: 'Settings',
              component: Settings
            },
            {
              path: '/profile',
              name: 'Profile',
              component: Profile
            },
          ]
        },
      ]
    },
    {
      path: '/pages',
      redirect: '/pages/404',
      name: 'Pages',
      component: {
        render (c) { return c('router-view') }
      },
      children: [
        {
          path: '404',
          name: 'Page404',
          component: Page404
        },
        {
          path: '500',
          name: 'Page500',
          component: Page500
        },
        {
          path: 'login',
          name: 'Login',
          component: Login
        },
        {
          path: 'register',
          name: 'Register',
          component: Register
        }
      ]
    }
  ]
}

