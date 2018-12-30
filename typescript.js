/* eslint-disable no-magic-numbers */
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import {readConfigFile} from 'typescript'
import webpack from 'webpack'
import {readFileSync} from 'fs'
import {join} from 'path'
import {trimEnd} from 'lodash'
const registerAlias = (paths, config, rootPath) => {
  const root = rootPath || config.resolve.alias['~~']
  const register = (flag, path) => {
    config.resolve.alias[flag] = join(root, trimEnd(path, '/*'))
  }
  Object.keys(paths).forEach((value) => {
    const flag = trimEnd(value, '/*')
    const item = paths[value]
    if(Array.isArray(item)){
      item.forEach((childValue) => {
        register(flag, childValue)
      })
    }else{
      register(flag, paths[value])
    }
  })
}
export default function(options) {
  const {
    configFile = 'tsconfig.build.json',
    alias = true,
    rootPath = this.nuxt.options.rootDir,
  } = options
  const tsConfig = readConfigFile(configFile, (path) => (readFileSync(path).toString()))
  const {
    config: {compilerOptions: {paths = {}} = {}},
  } = tsConfig
  // Add .ts extension for store, middleware and more
  this.nuxt.options.extensions.push('ts')
  this.nuxt.options.extensions.push('tsx')
  const dev = this.options.dev
  // Extend build
  this.extendBuild((config, {isDev}) => {
    const tsLoader = {
      // refer to https://github.com/nuxt/nuxt.js/issues/3164
      exclude: [
        /node_modules/,
        /vendor/,
        /dist/,
      ],
      use: [
        {
          loader: 'babel-loader',
        },
        {
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
            // refer to https://github.com/nuxt/nuxt.js/issues/3164
            configFile,
            transpileOnly: isDev,
            silent: true,
          },
        },
      ],
    }
    // Add TypeScript loader
    config.module.rules.push({
      // test: /((client|server)\.js)|(\.tsx?)$/,
      test: /\.tsx?$/,
      ...tsLoader,
    })
    if(dev){
      config.devtool = 'inline-source-map'
    }
    // Add TypeScript loader for vue files
    for(let rule of config.module.rules){
      if(rule.loader === 'vue-loader'){
        if(!rule.options.loaders){
          rule.options.loaders = {}
        }
        rule.options.loaders.ts = tsLoader
      }
    }
    // Add .ts extension in webpack resolve
    if(config.resolve.extensions.indexOf('.ts') === -1){
      config.resolve.extensions.push('.ts')
    }
    if(config.resolve.extensions.indexOf('.tsx') === -1){
      config.resolve.extensions.push('.tsx')
    }
    if(isDev){
      config.plugins.push(new ForkTsCheckerWebpackPlugin({
        checkSyntacticErrors: true,
        tslint: true,
        vue: true,
        watch: 'src',
        silent: true,
      }))
      config.plugins.push(new webpack.WatchIgnorePlugin([
        'src/**/*.js',
        /\.d\.ts$/,
      ]))
    }
    if(alias){
      registerAlias(paths, config, rootPath)
    }
  })
}
