/**
 * Created by jonayet on 11/18/16.
 */
import {appModule} from './app.module';

class AppController {
    constructor(){

    }

    $onInit(){

    }
}
AppController.$inject = [];

export const appController = 'appController';
appModule.controller(appController, AppController);