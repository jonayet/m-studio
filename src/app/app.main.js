/**
 * Created by jonayet on 11/18/16.
 */
require('./../styles/app.css');
import {appModule} from './app.module';
import './app.router';

config.$inject = [];
function config() {

}

appModule.config(config);

angular.bootstrap(document, [appModule.name]);