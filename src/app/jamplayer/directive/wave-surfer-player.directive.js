import {jamplayerModule} from './../jamplayer.module';

constructor.$inject = ["$compile", "waveSurferPlayerService"];
function constructor($compile, waveSurferPlayerService) {
    function directiveLink(scope, element, attrs) {
        var model = scope.player;
        var player = waveSurferPlayerService.initializePlayer(model.id, element);
        $compile(element.contents())(scope);

        model.onRequestRender = function () {
            $compile(element.contents())(scope);
        }

        scope.$watch(function () {
            return model.state.volume;
        }, function (newValue) {
            if (player.waveSurfer.isMuted)
                player.toggleMute();
            player.waveSurfer.setVolume(newValue);
        });

        scope.$on('$destroy', function () {
            player.destroy();
            element.remove();
        });
    }

    var factory = {
        restrict: "E",
        template: "<div></div>",
        link: directiveLink
    };
    return factory;
}

jamplayerModule.directive("waveSurferPlayer", constructor);