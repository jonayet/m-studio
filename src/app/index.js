/**
 * Created by jonayet on 11/18/16.
 */
require('./../styles/app.css');
import {appModule} from './app.module';
import './app.router';

config.$inject = ['$mdThemingProvider', '$translateProvider'];
function config($mdThemingProvider, $translateProvider) {
    $mdThemingProvider.theme('dark-grey').backgroundPalette('grey').dark();
    $mdThemingProvider.theme('dark-orange').backgroundPalette('orange').dark();
    $mdThemingProvider.theme('dark-purple').backgroundPalette('deep-purple').dark();
    $mdThemingProvider.theme('dark-blue').backgroundPalette('blue').dark();

    $mdThemingProvider.theme('dark-jamahook').backgroundPalette('blue').dark();

    $translateProvider.useSanitizeValueStrategy('escape');
    $translateProvider.preferredLanguage('en-US');
}

appModule.config(config);

angular.bootstrap(document, [appModule.name]);