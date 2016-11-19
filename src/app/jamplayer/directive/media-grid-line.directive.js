import {jamplayerModule} from '../jamplayer.module';

function directiveLink(scope, elem, attrs) {
    var containerWidth = elem[0].clientWidth;

    scope.vm.pixelPerSecond = containerWidth / scope.vm.timelineDuration;
    var gridDuration = scope.vm.pixelPerSecond * (scope.vm.secondPerGrid ? scope.vm.secondPerGrid : 1);

    for (var i = 0, j = 0; Math.round(i) <= containerWidth; i += gridDuration, j++) {
        /*var grid = { pixel: Math.round(gridDuration * j) - 1, time: j * scope.vm.secondPerGrid }
        scope.vm.grids.push(grid);*/
        scope.vm.grids[j * scope.vm.secondPerGrid] = Math.round(gridDuration * j) - 1;
    }
    //if (!appSuite.isProductionBuild) console.log(scope.vm.grids);
}

directiveController.$inject = [];
function directiveController() {
    var vm = this;
    vm.grids = {};

    vm.getProgressValue = function () {
        return (vm.currentTime / vm.timelineDuration) * 100;
    };
}

constructor.$inject = [];
function constructor() {
    var directive = {
        restrict: 'EA',
        scope: {
            currentTime: "=",
            pixelPerSecond: "=",
            secondPerGrid: "@",
            timelineDuration: "@",
            playCount: "@",
            heighlightGrid: "="
        },
        template:
        '<div class="jam-player-seeker" theme-background="accent" ng-style="{\'margin-left\': vm.getProgressValue() + \'%\'}">' +
        '<div class="jam-player-seeker-track md-caption bg-color-inherit color-inherit" ng-hide="!vm.playCount || vm.getProgressValue()==0">{{vm.currentTime * 1000 | date: \'mm:ss\'}}</div>' +
        '</div>' +
        '<div class="jam-player-grid" ng-repeat="(time, pixel) in vm.grids" theme-background="{{(time % 5 == 0) ? ((time % 10 == 0) ? \'primary:200\' : \'warn:hue-3\') : \'primary:300\'}}" ng-class="{\'active\':vm.heighlightGrid == pixel+1, \'jam-player-grid-long\': time % 5==0, \'jam-player-grid-num\': time % 10==0}" ng-style="{\'left\': pixel + \'px\'}">' +
        '<div class="jam-player-seeker-track md-caption" ng-hide="!vm.playCount">{{::time}}</div>' +
        '</div>',
        controller: directiveController,
        controllerAs: "vm",
        bindToController: true,
        link: directiveLink
    };
    return directive;
}

jamplayerModule.directive('mediaGridLine', constructor);