/**
 * Created by jonayet on 11/18/16.
 */
import {jamplayerModule} from './jamplayer.module';
require('./service/jamplayer.service');
require('./controller/jamplayer.controller');
require('./style/jamplayer.css');

config.$inject = ['$translateProvider'];
function config($translateProvider) {
    var requireContext = require.context("./i18n", false, /^(.*\.(json$))[^.]*$/igm);
    requireContext.keys().forEach(function(key){
        const langKey = key.split('lang-')[1].split('.json')[0];
        const translation = requireContext(key);
        $translateProvider.translations(langKey, translation);
    });


}
jamplayerModule.config(config);

run.$inject = [];
function run() {

}
jamplayerModule.run(run);