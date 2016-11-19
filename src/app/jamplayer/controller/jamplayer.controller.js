require('../service/jamplayer.service');
import {jamplayerModule} from '../jamplayer.module';
require('../directive/wave-surfer-player.directive');
//require('../directive/media-grid-line.directive');

constructor.$inject = ['$timeout', 'jamplayerService'];
function constructor($timeout, jamplayerService) {
    var vm = this;
    vm.pixelPerSecond = 0;
    vm.config = {
        duration: 150
    };

    var jamplayer;
    vm.jamplayer = null;
    vm.players = [];
    function init() {
        jamplayer = jamplayerService.getJamplayer(vm.config.duration, { config: { readOnly: false }, currentTime: 0 });
        jamplayer.onPlay = jamplayer.onPause = jamplayer.onFinish = jamplayer.onProgress = function () {
            $timeout(function() {}, 0);
        };

        jamplayer.onReferencePlayerSet = function(player) {
            if(player.tracks) {
                vm.referenceBpm = player.tracks[0].bpm;
                vm.referenceId = player.tracks[0].id;
            }
        };

        vm.jamplayer = jamplayer.state;
        vm.players = jamplayer.players;
    }

    vm.playPause = function () {
        jamplayerService.playPause(jamplayer.id);
    };

    vm.seekBackward = function () {
        jamplayerService.seekBackward(jamplayer.id);
    };

    vm.seekForward = function () {
        jamplayerService.seekForward(jamplayer.id);
    };

    vm.seekTo = function (time) {
        jamplayer.seekTo(time);
    }

    vm.toggleMute = function (player) {
        jamplayerService.toggleMute(player.id);
    };

    vm.removePlayer = function (player) {
        jamplayerService.removePlayer(player.id);
    };

    vm.viewFileUploader = function ($event) {
        var textValues = jamplayerXtConfigurationBuilderService.buildFileUploadText();
        var config = jamplayerXtConfigurationBuilderService.buildFileUploadConfig(textValues);
        fileUploaderModalService.showFileUploader($event, config).then(function (data) {
            jamplayerService.reset();
            ////$location.path("/upload-and-match/" + data.FileInfo.convertedFileId);
            var transitionStateName = getStateName();
            $state.go(transitionStateName, { id: data.FileInfo.convertedFileId, strategy: 'Harmony' });
        }, function (errorResponse) {
        });
    };

    vm.viewFullscreen = function(selector) {
        fullscreenService.toggleFullScreen(selector);
    };

    vm.viewFileSave = function ($event) {
        jamplayerService.savejam($event);
    };

    vm.viewShareJam = function ($event) {
        //jamplayerConfigurationBuilderService.sharejam($event);
        jamplayerService.broadcastEvent(jamplayerService.events.shareJam, $event);
    };

    vm.viewCopyJam = function ($event) {
        jamplayerService.broadcastEvent(jamplayerService.events.copyJam, $event);
    }

    vm.viewUpdateJam = function ($event) {
        jamplayerService.broadcastEvent(jamplayerService.events.updateJam, $event);
    }

    vm.toggleRepeat = function () {
        //jamplayerService.toggleRepeat(null);
    }

    vm.createCopy = function (player) {
        jamplayerService.copySelectedTrack(null, player.id);
    }

    vm.deleteTrack = function (ev, player) {
        var confirm = $mdDialog.confirm()
              .title($filter('translate')('JAMPLAYER.DELETE_TRACK_PROMPT'))
              .targetEvent(ev)
              .ok($filter('translate')('YES'))
              .cancel($filter('translate')('CANCEL'));

        $mdDialog.show(confirm).then(function () {
            jamplayerService.deleteSelectedTrack(null, player.id);
        });
    }

    init();
}

jamplayerModule.controller('jamplayerController', constructor);
