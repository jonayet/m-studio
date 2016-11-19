import {utility} from '../../app.utility';
import {jamplayerModule} from '../jamplayer.module';
require('./wave-surfer-player.service');

constructor.$inject = ['$rootScope', '$http', '$mdToast', '$filter', 'waveSurferPlayerService'];
function constructor($rootScope, $http, $mdToast, $filter, waveSurferPlayerService) {
    let jamplayer;
    let idGenerator = 0;

    const jamplayerDefaultConfig = {
        duration: 150,
        readOnly: false,
        playersLimit: 5
    };

    const jamplayerDeafultState = {
        config: jamplayerDefaultConfig,
        currentTime: 0,
        isPlaying: false,
        doRepeat: false,
        repeat: {
            start: 0,
            end: 10
        },
        players: []
    };

    const playerDefaultState = {
        volume: 1,
        isMuted: false
    };

    function Jamplayer(duration, state) {
        state = angular.extend({}, jamplayerDeafultState, state);
        const config = angular.extend({}, jamplayerDefaultConfig, state.config);
        if (duration) config.duration = duration;
        this.id = idGenerator++;
        this.config = config;
        this.state = state;
        this.referencePlayer = null;
        this.players = state.players;
        this.onInit = utility.noOperation;
        this.onReady = utility.noOperation;
        this.onPlay = utility.noOperation;
        this.onPause = utility.noOperation;
        this.onFinish = utility.noOperation;
        this.onProgress = utility.noOperation;
        this.onPlayerAdded = utility.noOperation;
        this.onPlayerRemove = utility.noOperation;
        this.onReferencePlayerSet = utility.noOperation;
    }

    Jamplayer.prototype.addPlayer = function (tracks, state) {
        state = angular.extend({}, playerDefaultState, state);
        const player = {
            id: idGenerator++,
            config: {
                canMove: !this.config.readOnly,
                canTrim: !this.config.readOnly,
                canCopy: !this.config.readOnly,
                canDelete: !this.config.readOnly,
                duration: this.config.duration
            },
            state: {
                currentTime: this.state.currentTime,
                volume: state.volume,
                isMuted: state.isMuted,
                doRepeat: state.doRepeat
            },
            tracks: tracks || [],
            waveSurferOptions: {
                waveColor: '#efefef',
                progressColor: '#26a69a',
                cursorColor: 'white',
                barWidth: 0,
                height: 50,
                skipLength: 10,
                interact: false,
                cursorWidth: 0,
                hideScrollbar: true,
                normalize: true
            },
            repeat: state.repeat,
            trackRegion: {
                color: "rgba(0, 0, 0, 0.1)",
                handleColor: "#26a69a"
            },
            selectionRegion: {
                color: "rgba(255, 255, 255, 0.1)",
                handleColor: "#26a69a"
            },
            repeatRegion: {
                color: "rgba(255, 0, 0, 0.1)",
                handleColor: "red"
            }
        };
        const self = this;
        player.onReady = function () {
            if (self.state.isPlaying) {
                setTimeout(function () {
                    self.play(self.state.currentTime);
                }, 10);
            }
        };
        if (!this.referencePlayer) this.hookReferencePlayer(player);
        waveSurferPlayerService.addPlayer(player);
        this.players.push(player);
        this.onPlayerAdded(player);
        return player;
    };

    Jamplayer.prototype.removePlayer = function (id) {
        const refPlayerShouldUpdate = this.referencePlayer.id === id;
        waveSurferPlayerService.getPlayer(id).destroy();
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            if (player.id === id) {
                this.onPlayerRemove(player);
                this.players.splice(i, 1);
                break;
            }
        }
        if (refPlayerShouldUpdate) {
            this.referencePlayer = null;
            if (this.players.length > 0) {
                this.hookReferencePlayer(this.players[0]);
            } else {
                this.state.currentTime = 0;
            }
        }
    };

    Jamplayer.prototype.hookReferencePlayer = function (player) {
        const self = this;
        player.onPlay = function () {
            self.state.isPlaying = true;
            self.onPlay();
        };
        player.onPause = function () {
            self.state.isPlaying = false;
            self.onPause();
        };
        player.onFinish = function () {
            self.state.isPlaying = false;
            self.onFinish();
        };
        player.onProgress = function (progress) {
            self.state.currentTime = progress;
            self.onProgress(progress);
        };
        self.referencePlayer = player;
        self.onReferencePlayerSet(player);
    };

    Jamplayer.prototype.getState = function () {
        return {
            config: {
                duration: this.config.duration,
                readOnly: this.config.readOnly
            },
            state: {
                currentTime: this.state.currentTime
            },
            players: this.players
        };
    };

    Jamplayer.prototype.setState = function (state) {
        state.config = state.config || {};
        this.reset();
        this.config.readOnly = state.config.readOnly || false;
        this.state.currentTime = state.state.currentTime || 0;
        const self = this;
        state.players = state.players || [];
        state.players.forEach(function (player) {
            self.addPlayer(player.tracks, player.state);
        });
    };

    Jamplayer.prototype.play = function (start, end) {
        this.players.forEach(function (player) {
            waveSurferPlayerService.getPlayer(player.id).waveSurfer.play(start, end);
        });
    };

    Jamplayer.prototype.pause = function () {
        this.players.forEach(function (player) {
            const controller = waveSurferPlayerService.getPlayer(player.id);
            if (controller.waveSurfer.isPlaying()) controller.waveSurfer.pause();
        });
    };

    Jamplayer.prototype.stop = function () {
        this.players.forEach(function (player) {
            const controller = waveSurferPlayerService.getPlayer(player.id);
            if (controller.waveSurfer.isPlaying()) controller.waveSurfer.stop();
        });
    };

    Jamplayer.prototype.playPause = function () {
        if (!this.state.isPlaying) {
            this.play(this.state.currentTime);
        } else {
            this.pause();
        }
    };

    Jamplayer.prototype.seekBackward = function () {
        this.players.forEach(function (player) {
            const controller = waveSurferPlayerService.getPlayer(player.id);
            controller.waveSurfer.skipBackward();
        });
    };

    Jamplayer.prototype.seekForward = function () {
        this.players.forEach(function (player) {
            const controller = waveSurferPlayerService.getPlayer(player.id);
            controller.waveSurfer.skipForward();
        });
    };

    Jamplayer.prototype.seekTo = function (time) {
        const self = this;
        this.players.forEach(function (player) {
            const controller = waveSurferPlayerService.getPlayer(player.id);
            controller.waveSurfer.seekTo(time / self.config.duration);
        });
    };

    Jamplayer.prototype.setEditPermissions = function (permissions) {
        if (angular.isDefined(permissions.readOnly)) {
            this.config.readOnly = permissions.readOnly;
        }
        const self = this;
        this.players.forEach(function (player) {
            const controller = waveSurferPlayerService.getPlayer(player.id);
            if (angular.isDefined(permissions.readOnly)) {
                controller.config.canMove = !self.config.readOnly;
                controller.config.canTrim = !self.config.readOnly;
                controller.drawTrackRegions();
            }
        });
    };

    Jamplayer.prototype.reset = function () {
        this.stop();
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            waveSurferPlayerService.getPlayer(player.id).destroy();
        }
        this.referencePlayer = null;
        this.state.isPlaying = false;
        this.state.currentTime = 0;
        this.players.length = 0;
    };

    Jamplayer.prototype.switchReferencePlayer = function (idx, player) {
        jamplayer.players.unshift(jamplayer.players.splice(idx, 1)[0]);
        jamplayer.onReferencePlayerSet(player);
        $rootScope.$broadcast('referenceTrackSwitched', player.tracks[0].fileId);
        this.referencePlayer = null;
        player.tracks[0].url = player.tracks[0].rootSrc;
        player.tracks[0].bpm = player.tracks[0].rootBpm;
        this.hookReferencePlayer(player);
    };

    Jamplayer.prototype.toggleRepeat = function (start, end) {
        start = start || this.state.repeat.start;
        end = end || this.state.repeat.end;
        const self = this;
        this.players.forEach(function (player) {
            const controller = waveSurferPlayerService.getPlayer(player.id);
            if (self.state.doRepeat) {
                controller.clearRepeat();
            } else {
                controller.setRepeat(start, end);
            }
        });
        this.state.doRepeat = !this.state.doRepeat;
    };

    function getConfig() {
        return jamplayerDefaultConfig;
    }

    function setConfig(config) {
        angular.extend(jamplayerDefaultConfig, config);
    }

    function getJamplayer(duration, state) {
        if (jamplayer) return jamplayer;
        jamplayer = new Jamplayer(duration, state);
        return jamplayer;
    }

    function playPause(id) {
        jamplayer.playPause();
    }

    function seekBackward(id) {
        jamplayer.seekBackward();
    }

    function seekForward(id) {
        jamplayer.seekForward();
    }

    function addPlayer(id, tracks, state) {
        if (jamplayer.players.length === jamplayerDefaultConfig.playersLimit) {
            $mdToast.show($mdToast.simple()
                .content($filter("translate")("JAMPLAYER.MAX_TRACK_NUMBER_REACHED"))
                .position("bottom right")
                .hideDelay(1000));
            return;
        }


        if (jamplayer.referencePlayer && tracks[0].bpm !== jamplayer.referencePlayer.tracks[0].bpm) {
            convertBpm(null, tracks[0].trackName, tracks[0].rootSrc, tracks[0].bpm).then(function (result) {
                let changedSrc = result.OutputAudioUri;
                if (!changedSrc) {
                    $mdToast.show($mdToast.simple()
                        .content($filter('translate')('JAMPLAYER.BPM_CONVERSION_FAILED'))
                        .position("bottom right")
                        .hideDelay(1000));

                    return;
                }

                tracks[0].url = changedSrc;
                tracks[0].bpm = result.targetBpm;

                jamplayer.addPlayer(tracks, state);

                $mdToast.show($mdToast.simple()
                    .content($filter('translate')('JAMPLAYER.BPM_CONVERTED'))
                    .position("bottom right")
                    .hideDelay(1000));
            }, function (error) {
                if (error === "conversionFailed") {
                    jamplayer.addPlayer(tracks, state);

                    $mdToast.show($mdToast.simple()
                        .content($filter('translate')('JAMPLAYER.BPM_CONVERSION_FAILED'))
                        .position("bottom right")
                        .hideDelay(1000));
                } else {
                    jamplayer.addPlayer(tracks, state);
                }
            });

            return;
        }

        jamplayer.addPlayer(tracks, state);
    }

    function removePlayer(id) {
        jamplayer.removePlayer(id);
    }

    function toggleMute(playerId) {
        waveSurferPlayerService.getPlayer(playerId).toggleMute();
    }

    function getState(id) {
        return jamplayer.getState();
    }

    function setState(id, state) {
        return jamplayer.setState(state);
    }

    function reset(id) {
        jamplayer.reset();
    }

    function setEditPermissions(id, permissions) {
        jamplayer.setEditPermissions(permissions);
    }

    function setPlayerRoute(pr) {
        playerRoute = pr;
    }

    function toggleRepeat(id, playerId, start, end) {
        jamplayer.toggleRepeat(start, end);
    }

    function copySelectedTrack(id, playerId) {
        waveSurferPlayerService.getPlayer(playerId).copySelectedTrack();
    }

    function deleteSelectedTrack(id, playerId) {
        waveSurferPlayerService.getPlayer(playerId).deleteSelectedTrack();
    }

    function init() {
        $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
            const previousRoute = fromState.name;
            if (previousRoute === playerRoute) {
                jamplayer.reset();
            }
        });

        var jamplayerState = require('../jamplayer.json');
        jamplayer = getJamplayer();
        jamplayer.setState(jamplayerState);
    }

    init();

    this.getJamplayer = getJamplayer;
    this.playPause = playPause;
    this.seekBackward = seekBackward;
    this.seekForward = seekForward;
    this.toggleMute = toggleMute;
    this.getState = getState;
    this.setState = setState;
    this.setEditPermissions = setEditPermissions;
    this.reset = reset;
    this.addPlayer = addPlayer;
    this.toggleRepeat = toggleRepeat;
    this.copySelectedTrack = copySelectedTrack;
    this.deleteSelectedTrack = deleteSelectedTrack;
}

jamplayerModule.service('jamplayerService', constructor);