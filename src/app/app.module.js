/**
 * Created by jonayet on 11/18/16.
 */
require('./jamplayer');

const appModule =  angular.module('app', ['ui.router', 'ngMaterial', 'pascalprecht.translate', 'jamplayer']);
export {appModule};